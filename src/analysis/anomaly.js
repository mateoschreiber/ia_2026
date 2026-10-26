/* Detección de anomalías por estadística básica (z-score, IQR, media móvil). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  function mean(values) {
    if (!values.length) return 0;
    var sum = 0;
    values.forEach(function (v) { sum += Number(v) || 0; });
    return sum / values.length;
  }

  function std(values) {
    if (!values.length) return 0;
    var m = mean(values);
    var sq = 0;
    values.forEach(function (v) { var d = (Number(v) || 0) - m; sq += d * d; });
    return Math.sqrt(sq / values.length);
  }

  function zScores(values) {
    var m = mean(values);
    var s = std(values);
    if (s === 0) return values.map(function () { return 0; });
    return values.map(function (v) { return ((Number(v) || 0) - m) / s; });
  }

  // Devuelve índices cuyo |z| supera el umbral.
  function flagByZScore(values, threshold) {
    var th = threshold || 3;
    return zScores(values).map(function (z, i) {
      return { index: i, value: values[i], z: z, flag: Math.abs(z) > th };
    });
  }

  App.Analysis.anomaly = {
    mean: mean,
    std: std,
    zScores: zScores,
    flagByZScore: flagByZScore
  };
})(window);
