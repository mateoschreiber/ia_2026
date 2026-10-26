/* Métricas de evaluación del modelo contra las etiquetas (ground truth).

   Compara dataset.detections (scores/flags) con dataset.labels (isFraud) y
   calcula precision@k, recall, matriz de confusión, F1 y la curva de
   inspección (fraudes encontrados vs número de medidores revisados). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  function evaluate(dataset) {
    var detections = (dataset.detections || []).slice().sort(function (a, b) {
      return b.score - a.score;
    });

    var labels = {};
    var archetypes = {};
    (dataset.labels || []).forEach(function (l) {
      labels[l.meterId] = !!l.isFraud;
      if (l.isFraud && l.archetype) archetypes[l.meterId] = l.archetype;
    });

    // solo medidores con etiqueta y detección
    var ranked = detections.filter(function (d) { return Object.prototype.hasOwnProperty.call(labels, d.meterId); });

    var fraudTotal = 0;
    Object.keys(labels).forEach(function (id) { if (labels[id]) fraudTotal++; });

    // curva de inspección (acumulado)
    var hits = 0;
    var curve = ranked.map(function (d, i) {
      if (labels[d.meterId]) hits++;
      return { k: i + 1, hits: hits };
    });

    function atK(k) {
      var n = Math.min(k, ranked.length);
      var h = 0;
      for (var i = 0; i < n; i++) if (labels[ranked[i].meterId]) h++;
      return {
        k: n,
        hits: h,
        precision: n ? h / n : 0,
        recall: fraudTotal ? h / fraudTotal : 0
      };
    }

    // matriz de confusión a partir del flag
    var tp = 0, fp = 0, tn = 0, fn = 0;
    ranked.forEach(function (d) {
      var fraud = labels[d.meterId];
      if (d.flag && fraud) tp++;
      else if (d.flag && !fraud) fp++;
      else if (!d.flag && fraud) fn++;
      else tn++;
    });

    var precision = (tp + fp) ? tp / (tp + fp) : 0;
    var recall = (tp + fn) ? tp / (tp + fn) : 0;
    var f1 = (precision + recall) ? 2 * precision * recall / (precision + recall) : 0;
    var accuracy = ranked.length ? (tp + tn) / ranked.length : 0;

    // por arquetipo (rank del medidor fraudulento)
    var archetypeRows = [];
    Object.keys(archetypes).forEach(function (meterId) {
      var idx = -1, score = null, flag = false;
      for (var i = 0; i < ranked.length; i++) {
        if (ranked[i].meterId === meterId) { idx = i; score = ranked[i].score; flag = ranked[i].flag; break; }
      }
      archetypeRows.push({
        archetype: archetypes[meterId],
        meterId: meterId,
        rank: idx + 1,
        score: score,
        flag: flag
      });
    });
    archetypeRows.sort(function (a, b) { return a.rank - b.rank; });

    return {
      n: ranked.length,
      fraudTotal: fraudTotal,
      confusion: { tp: tp, fp: fp, tn: tn, fn: fn },
      precision: precision,
      recall: recall,
      f1: f1,
      accuracy: accuracy,
      thresholdFlags: ranked.filter(function (d) { return d.flag; }).length,
      atK: [5, 10, 20, 30, 50].map(atK),
      curve: curve,
      archetypes: archetypeRows
    };
  }

  App.Analysis.metrics = { evaluate: evaluate };
})(window);
