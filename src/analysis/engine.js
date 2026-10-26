/* Motor de análisis (orquestador).

   Reúne features + Isolation Forest + autoencoder + scoring estadístico y
   produce:
   - detections[]: score combinado por medidor (0..1) y flag.
   - forecast[]:  pico de demanda pronosticado por zona (percentil 95).
   - alerts[]:    sobrecarga de transformadores, pérdidas por balance y
                  medidores con alta probabilidad de pérdida no técnica.
*/
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  var ID_ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

  function randomId(len) {
    var out = '', n = len || 8;
    for (var i = 0; i < n; i++) out += ID_ALPHABET.charAt(Math.floor(Math.random() * ID_ALPHABET.length));
    return out;
  }

  function round2(v) { return Math.round(v * 100) / 100; }
  function round4(v) { return Math.round(v * 10000) / 10000; }

  function normalize01(scores) {
    if (!scores.length) return [];
    var mn = Infinity, mx = -Infinity;
    scores.forEach(function (s) { if (s < mn) mn = s; if (s > mx) mx = s; });
    if (mx === mn) return scores.map(function () { return 0.5; });
    return scores.map(function (s) { return (s - mn) / (mx - mn); });
  }

  function percentile(sortedAsc, q) {
    if (!sortedAsc.length) return 0;
    var idx = Math.min(sortedAsc.length - 1, Math.floor(q * (sortedAsc.length - 1)));
    return sortedAsc[idx];
  }

  function statisticalScores(stdData) {
    // promedio de |z| por fila (cada columna ya está estandarizada)
    return stdData.map(function (row) {
      var s = 0;
      for (var i = 0; i < row.length; i++) s += Math.abs(row[i]);
      return s / row.length;
    });
  }

  function transformerPeak(dataset) {
    var trafoLoad = {}, trafoMeters = {};
    (dataset.transformers || []).forEach(function (t) { trafoLoad[t.id] = new Array(8760); for (var i = 0; i < 8760; i++) trafoLoad[t.id][i] = 0; });
    (dataset.meters || []).forEach(function (m) { trafoMeters[m.id] = m.transformerId; });
    (dataset.readings || []).forEach(function (r) {
      var tid = trafoMeters[r.meterId];
      if (!tid || !trafoLoad[tid]) return;
      var kwh = r.kwh;
      for (var i = 0; i < kwh.length; i++) trafoLoad[tid][i] += kwh[i];
    });
    var peak = {};
    (dataset.transformers || []).forEach(function (t) {
      var arr = trafoLoad[t.id];
      var mx = -Infinity;
      for (var i = 0; i < arr.length; i++) if (arr[i] > mx) mx = arr[i];
      peak[t.id] = mx === -Infinity ? 0 : mx;
    });
    return peak;
  }

  function buildAlerts(dataset, combined, ids, threshold) {
    var alerts = [];
    var now = new Date().toISOString();

    // 1) sobrecarga de transformadores (carga pico vs capacidad)
    var peak = transformerPeak(dataset);
    (dataset.transformers || []).forEach(function (t) {
      var p = peak[t.id] || 0;
      var ratio = t.capacityKva > 0 ? p / t.capacityKva : 0;
      var severity = null;
      if (ratio >= 1.0) severity = 'critica';
      else if (ratio >= 0.9) severity = 'alta';
      else if (ratio >= 0.75) severity = 'media';
      if (severity) {
        alerts.push({
          id: randomId(8), type: 'sobrecarga', severity: severity,
          transformerId: t.id,
          message: 'Carga pico ' + round2(p) + ' kW vs ' + t.capacityKva + ' kVA (' + round2(ratio * 100) + ' %).',
          createdAt: now
        });
      }
    });

    // 2) pérdidas por balance energético (suministrado vs facturado)
    try {
      var balances = App.Analysis.balance.transformerBalance(dataset);
      balances.forEach(function (bl) {
        if (bl.lossPct > 12) {
          var sev = bl.lossPct > 25 ? 'critica' : (bl.lossPct > 18 ? 'alta' : 'media');
          alerts.push({
            id: randomId(8), type: 'perdida', severity: sev,
            transformerId: bl.transformerId,
            message: 'Pérdidas ' + round2(bl.lossPct) + ' % (' + round2(bl.losses) + ' kWh).',
            createdAt: now
          });
        }
      });
    } catch (err) { console.warn('[engine] balance falló:', err); }

    // 3) medidores con alta probabilidad de pérdida no técnica
    ids.forEach(function (id, i) {
      if (combined[i] >= threshold) {
        alerts.push({
          id: randomId(8), type: 'perdida', severity: 'alta',
          meterId: id,
          message: 'Alta probabilidad de pérdida no técnica (score ' + round2(combined[i]) + ').',
          createdAt: now
        });
      }
    });

    return alerts;
  }

  function run(dataset, opts) {
    opts = opts || {};
    var seed = opts.seed === undefined ? 42 : opts.seed;

    var feat = App.Analysis.features.extract(dataset);
    if (!feat.ids.length) {
      return { detections: [], forecast: [], alerts: [], threshold: 0 };
    }
    var stdData = App.Analysis.features.standardize(feat.matrix).data;

    var ifRes = App.Analysis.isolationForest.fitAndScore(stdData, { seed: seed });
    var aeRes = App.Analysis.autoencoder.fitAndScore(stdData, { seed: seed + 1 });
    var stat = statisticalScores(stdData);

    var ifN = normalize01(ifRes.scores);
    var aeN = normalize01(aeRes.scores);
    var stN = normalize01(stat);

    var combined = feat.ids.map(function (_, i) {
      return 0.45 * ifN[i] + 0.30 * aeN[i] + 0.25 * stN[i];
    });

    var sorted = combined.slice().sort(function (a, b) { return a - b; });
    var threshold = percentile(sorted, 0.90);

    var detections = feat.ids.map(function (id, i) {
      return {
        id: randomId(8),
        meterId: id,
        model: 'combinado',
        score: round4(combined[i]),
        flag: combined[i] >= threshold,
        createdAt: new Date().toISOString()
      };
    });

    var forecast = App.Analysis.forecast.predictPeaks(dataset).map(function (f) {
      f.id = randomId(8);
      return f;
    });

    var alerts = buildAlerts(dataset, combined, feat.ids, threshold);

    return { detections: detections, forecast: forecast, alerts: alerts, threshold: round4(threshold) };
  }

  function apply(dataset, opts) {
    var r = run(dataset, opts);
    dataset.detections = r.detections;
    dataset.forecast = r.forecast;
    dataset.alerts = r.alerts;
    return r;
  }

  App.Analysis.engine = { run: run, apply: apply };
})(window);
