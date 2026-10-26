/* Extracción de features por medidor a partir de la serie horaria.

   Features (informadas por la literatura de NTL):
   - totalKwh, meanHourly, stdHourly, cv (planicidad)
   - zeroRatio (fracción de horas casi nulas)
   - nightRatio (0-6h) y eveningRatio (18-22h)
   - maxHourly, peakHour (hora de mayor consumo medio)
   - relNeighborhood (consumo total relativo a la media de su transformador)
*/
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  var FEATURE_NAMES = [
    'totalKwh', 'meanHourly', 'stdHourly', 'cv', 'zeroRatio',
    'nightRatio', 'eveningRatio', 'maxHourly', 'peakHour', 'relNeighborhood', 'relTypeTotal'
  ];

  function median(arr) {
    var s = arr.slice().sort(function (a, b) { return a - b; });
    var mid = Math.floor(s.length / 2);
    return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
  }

  function extract(dataset) {
    var meters = dataset.meters || [];
    var readings = dataset.readings || [];

    var seriesMap = {};
    readings.forEach(function (r) { seriesMap[r.meterId] = r.kwh; });

    // totales por medidor (evita recomputar en relNeighborhood)
    var totals = {};
    meters.forEach(function (meter) {
      var k = seriesMap[meter.id];
      var s = 0;
      if (k) for (var i = 0; i < k.length; i++) s += k[i];
      totals[meter.id] = s;
    });

    // mediana de total por tipo de cliente (robusta a los ~7% fraudulentos)
    var typeTotals = {};
    meters.forEach(function (meter) {
      if (!typeTotals[meter.customerType]) typeTotals[meter.customerType] = [];
      typeTotals[meter.customerType].push(totals[meter.id] || 0);
    });
    var typeMedian = {};
    for (var k in typeTotals) typeMedian[k] = median(typeTotals[k]);

    var byTrafo = {};
    meters.forEach(function (meter) {
      if (!byTrafo[meter.transformerId]) byTrafo[meter.transformerId] = [];
      byTrafo[meter.transformerId].push(meter.id);
    });

    var ids = [];
    var matrix = [];

    meters.forEach(function (meter) {
      var kwh = seriesMap[meter.id];
      if (!kwh || !kwh.length) return;
      var n = kwh.length;
      var total = totals[meter.id] || 0;
      var mu = total / n;
      var sd = 0, minv = Infinity, mx = -Infinity, zeros = 0, night = 0, evening = 0;
      var hourSum = new Array(24), hourCnt = new Array(24);
      for (var h = 0; h < 24; h++) { hourSum[h] = 0; hourCnt[h] = 0; }

      for (var i = 0; i < n; i++) {
        var v = kwh[i];
        if (v < minv) minv = v;
        if (v > mx) mx = v;
        if (v <= 0.05) zeros++;
        var hh = i % 24;
        if (hh < 6) night += v;
        if (hh >= 18 && hh < 22) evening += v;
        hourSum[hh] += v;
        hourCnt[hh]++;
        var d = v - mu;
        sd += d * d;
      }
      sd = Math.sqrt(sd / n);
      var cv = mu > 0 ? sd / mu : 0;
      var zeroRatio = zeros / n;
      var nightRatio = total > 0 ? night / total : 0;
      var eveningRatio = total > 0 ? evening / total : 0;
      var peakHour = 0, peakVal = -Infinity;
      for (var h2 = 0; h2 < 24; h2++) {
        var avg = hourCnt[h2] ? hourSum[h2] / hourCnt[h2] : 0;
        if (avg > peakVal) { peakVal = avg; peakHour = h2; }
      }
      var nb = byTrafo[meter.transformerId] || [];
      var nbTotal = 0;
      for (var j = 0; j < nb.length; j++) nbTotal += (totals[nb[j]] || 0);
      var nbMean = nb.length ? nbTotal / nb.length : total;
      var rel = nbMean > 0 ? total / nbMean : 0;
      var relType = typeMedian[meter.customerType] > 0 ? total / typeMedian[meter.customerType] : 0;

      ids.push(meter.id);
      matrix.push([total, mu, sd, cv, zeroRatio, nightRatio, eveningRatio, mx, peakHour, rel, relType]);
    });

    return { ids: ids, matrix: matrix, names: FEATURE_NAMES };
  }

  function standardize(matrix) {
    if (!matrix.length) return { data: [], means: [], stds: [] };
    var n = matrix.length, p = matrix[0].length;
    var means = new Array(p), stds = new Array(p);
    for (var j = 0; j < p; j++) {
      var s = 0;
      for (var i = 0; i < n; i++) s += matrix[i][j];
      means[j] = s / n;
    }
    for (var j = 0; j < p; j++) {
      var sq = 0;
      for (var i = 0; i < n; i++) { var d = matrix[i][j] - means[j]; sq += d * d; }
      stds[j] = Math.sqrt(sq / n) || 1;
    }
    var data = [];
    for (var i = 0; i < n; i++) {
      var row = [];
      for (var j = 0; j < p; j++) row.push((matrix[i][j] - means[j]) / stds[j]);
      data.push(row);
    }
    return { data: data, means: means, stds: stds };
  }

  App.Analysis.features = { extract: extract, standardize: standardize, names: FEATURE_NAMES };
})(window);
