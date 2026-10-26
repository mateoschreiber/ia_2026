/* Autoencoder — pendiente (F3).
   Solo se ejecutará la inferencia (forward) con pesos y umbral precomputados
   embebidos en la base de datos. El entrenamiento NO ocurre en el navegador. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  function score() {
    console.warn('[autoencoder] pendiente de implementar en F3.');
    return { scores: [], flags: [], reconstructionError: [] };
  }

  App.Analysis.autoencoder = { score: score };
})(window);
