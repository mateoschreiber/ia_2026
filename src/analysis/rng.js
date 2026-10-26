/* Generador de números pseudoaleatorios determinista (mulberry32).
   Se usa para que Isolation Forest y el autoencoder sean reproducibles. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  function mulberry32(seed) {
    var a = seed >>> 0;
    return function () {
      a |= 0; a = (a + 0x6D2B79F5) | 0;
      var t = Math.imul(a ^ (a >>> 15), 1 | a);
      t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRng(seed) {
    var next = mulberry32(seed === undefined ? 42 : seed);
    return {
      random: next,
      int: function (n) { return Math.floor(next() * n); },
      gauss: function () {
        var u = 0, v = 0;
        while (u === 0) u = next();
        while (v === 0) v = next();
        return Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
      }
    };
  }

  App.Analysis.rng = { mulberry32: mulberry32, makeRng: makeRng };
})(window);
