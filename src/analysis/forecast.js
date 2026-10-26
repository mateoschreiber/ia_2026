/* Pronóstico de demanda máxima — pendiente (F3).
   API planificada:
     predictPeak(series, weather, opts) -> { peakKw, quantile, baseline, thermal }
   Incluirá modelo aditivo (base + respuesta térmica + calendario) y
   regresión cuantílica para el percentil 95. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  function predictPeak() {
    console.warn('[forecast] pendiente de implementar en F3.');
    return null;
  }

  App.Analysis.forecast = { predictPeak: predictPeak };
})(window);
