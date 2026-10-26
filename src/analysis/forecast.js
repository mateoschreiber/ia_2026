/* Pronóstico de demanda máxima por zona.

   Modelo aditivo: pico diario = b0 + b1*max(0,T-25) + b2*max(0,T-25)^2
   ajustado por mínimos cuadrados; el pico pronosticado es el percentil 95
   (fit + 1.645*sigma de residuos) para la temperatura máxima observada. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  function round2(v) { return Math.round(v * 100) / 100; }
  function round1(v) { return Math.round(v * 10) / 10; }

  function std(values) {
    if (!values.length) return 0;
    var s = 0;
    for (var i = 0; i < values.length; i++) s += values[i];
    var m = s / values.length;
    var sq = 0;
    for (var j = 0; j < values.length; j++) { var d = values[j] - m; sq += d * d; }
    return Math.sqrt(sq / values.length);
  }

  function zoneHourlySeries(dataset) {
    var zones = {};
    (dataset.zones || []).forEach(function (z) { zones[z.id] = new Array(8760); for (var i = 0; i < 8760; i++) zones[z.id][i] = 0; });

    var trafoZone = {};
    (dataset.transformers || []).forEach(function (t) { trafoZone[t.id] = t.zoneId; });
    var meterZone = {};
    (dataset.meters || []).forEach(function (m) { meterZone[m.id] = trafoZone[m.transformerId]; });

    (dataset.readings || []).forEach(function (r) {
      var zid = meterZone[r.meterId];
      if (!zid || !zones[zid]) return;
      var kwh = r.kwh;
      for (var i = 0; i < kwh.length; i++) zones[zid][i] += kwh[i];
    });
    return zones;
  }

  // Eliminación gaussiana con pivoteo parcial (sistema cuadrado).
  function solve(A, b) {
    var n = b.length;
    var M = [];
    for (var i = 0; i < n; i++) {
      M[i] = [];
      for (var j = 0; j < n; j++) M[i][j] = A[i][j];
      M[i][n] = b[i];
    }
    for (var c = 0; c < n; c++) {
      var pivot = c;
      for (var r = c + 1; r < n; r++) if (Math.abs(M[r][c]) > Math.abs(M[pivot][c])) pivot = r;
      var tmp = M[c]; M[c] = M[pivot]; M[pivot] = tmp;
      var d = M[c][c] || 1e-9;
      for (var r2 = c + 1; r2 < n; r2++) {
        var f = M[r2][c] / d;
        for (var k = c; k <= n; k++) M[r2][k] -= f * M[c][k];
      }
    }
    var x = new Array(n);
    for (var r = n - 1; r >= 0; r--) {
      var s = M[r][n];
      for (var c2 = r + 1; c2 < n; c2++) s -= M[r][c2] * x[c2];
      x[r] = s / (M[r][r] || 1e-9);
    }
    return x;
  }

  function predictZone(series, tempC) {
    var dailyPeaks = [], dailyMaxT = [];
    for (var d = 0; d < 365; d++) {
      var pk = -Infinity, mt = -Infinity;
      for (var h = 0; h < 24; h++) {
        var i = d * 24 + h;
        if (series[i] > pk) pk = series[i];
        var t = tempC[i];
        if (t > mt) mt = t;
      }
      dailyPeaks.push(pk);
      dailyMaxT.push(mt);
    }

    var X = [], y = [];
    for (var j = 0; j < 365; j++) {
      var e = Math.max(0, dailyMaxT[j] - 25);
      X.push([1, e, e * e]);
      y.push(dailyPeaks[j]);
    }

    var A = [[0, 0, 0], [0, 0, 0], [0, 0, 0]], b = [0, 0, 0];
    for (var r = 0; r < 365; r++) {
      for (var a = 0; a < 3; a++) {
        b[a] += X[r][a] * y[r];
        for (var cc = 0; cc < 3; cc++) A[a][cc] += X[r][a] * X[r][cc];
      }
    }
    // regularización (ridge) mínima para estabilidad numérica
    for (var d2 = 0; d2 < 3; d2++) A[d2][d2] += 1e-6;

    var beta = solve(A, b);

    var resid = [];
    for (var r2 = 0; r2 < 365; r2++) {
      var fit = beta[0] + beta[1] * X[r2][1] + beta[2] * X[r2][2];
      resid.push(dailyPeaks[r2] - fit);
    }
    var residStd = std(resid);
    var hottest = -Infinity;
    for (var h3 = 0; h3 < dailyMaxT.length; h3++) if (dailyMaxT[h3] > hottest) hottest = dailyMaxT[h3];
    var eMax = Math.max(0, hottest - 25);
    var peak95 = beta[0] + beta[1] * eMax + beta[2] * eMax * eMax + 1.645 * residStd;

    return {
      peakKw: round2(Math.max(0, peak95)),
      baselineKw: round2(Math.max(0, beta[0])),
      peakTempC: round1(hottest),
      residStd: round2(residStd)
    };
  }

  function predictPeaks(dataset) {
    var zones = zoneHourlySeries(dataset);
    var tempC = (dataset.weather && dataset.weather.tempC) || [];
    var out = [];
    (dataset.zones || []).forEach(function (z) {
      var series = zones[z.id];
      if (!series) return;
      var p = predictZone(series, tempC);
      out.push({
        zoneId: z.id,
        zoneName: z.name,
        ts: (dataset.weather && dataset.weather.start) || '',
        peakKw: p.peakKw,
        baselineKw: p.baselineKw,
        quantile: 0.95,
        peakTempC: p.peakTempC
      });
    });
    return out;
  }

  App.Analysis.forecast = { predictPeaks: predictPeaks };
})(window);
