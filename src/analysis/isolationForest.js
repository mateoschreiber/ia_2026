/* Isolation Forest — pendiente (F3).
   API planificada:
     score(seriesMatrix) -> { scores: number[], flags: boolean[], depth: number[] }
   Se implementará en la Fase 3 del proyecto. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  function score() {
    console.warn('[isolationForest] pendiente de implementar en F3.');
    return { scores: [], flags: [], depth: [] };
  }

  App.Analysis.isolationForest = { score: score };
})(window);
