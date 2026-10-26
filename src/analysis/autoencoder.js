/* Autoencoder (una capa oculta) entrenado in-browser.

   Aprende a reconstruir el vector de features; el error de reconstrucción
   es el score de anomalía (mayor error = más anómalo). Entrenamiento con
   descenso de gradiente por lote completo y pesos deterministas (seed). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  function sigmoid(x) { return 1 / (1 + Math.exp(-x)); }

  function zeros(r, c) {
    var m = [];
    for (var i = 0; i < r; i++) { m[i] = []; for (var j = 0; j < c; j++) m[i][j] = 0; }
    return m;
  }
  function zeros1(n) { var a = []; for (var i = 0; i < n; i++) a[i] = 0; return a; }

  function Autoencoder(opts) {
    opts = opts || {};
    this.hidden = opts.hidden || 4;
    this.epochs = opts.epochs || 400;
    this.lr = opts.lr || 0.1;
    this.rng = opts.rng || App.Analysis.rng.makeRng(opts.seed);
  }

  Autoencoder.prototype.fit = function (data) {
    var n = data.length, p = data[0].length, h = this.hidden;
    var W1 = zeros(p, h), b1 = zeros1(h), W2 = zeros(h, p), b2 = zeros1(p);
    for (var j = 0; j < p; j++) for (var k = 0; k < h; k++) W1[j][k] = this.rng.gauss() * 0.1;
    for (var k2 = 0; k2 < h; k2++) for (var j2 = 0; j2 < p; j2++) W2[k2][j2] = this.rng.gauss() * 0.1;

    for (var e = 0; e < this.epochs; e++) {
      var gW1 = zeros(p, h), gb1 = zeros1(h), gW2 = zeros(h, p), gb2 = zeros1(p);
      for (var i = 0; i < n; i++) {
        var x = data[i];
        var a1 = new Array(h);
        for (var k = 0; k < h; k++) { var s = b1[k]; for (var j = 0; j < p; j++) s += x[j] * W1[j][k]; a1[k] = sigmoid(s); }
        var a2 = new Array(p);
        for (var j3 = 0; j3 < p; j3++) { var s2 = b2[j3]; for (var k3 = 0; k3 < h; k3++) s2 += a1[k3] * W2[k3][j3]; a2[j3] = s2; }

        var delta2 = new Array(p);
        for (var j4 = 0; j4 < p; j4++) delta2[j4] = (a2[j4] - x[j4]);
        for (var k4 = 0; k4 < h; k4++) {
          var g = 0;
          for (var j5 = 0; j5 < p; j5++) g += delta2[j5] * W2[k4][j5];
          g *= a1[k4] * (1 - a1[k4]);
          gb1[k4] += g;
          for (var j6 = 0; j6 < p; j6++) { gW1[j6][k4] += g * x[j6]; gW2[k4][j6] += delta2[j6] * a1[k4]; }
        }
        for (var j7 = 0; j7 < p; j7++) gb2[j7] += delta2[j7];
      }
      for (var j = 0; j < p; j++) for (var k = 0; k < h; k++) W1[j][k] -= this.lr * gW1[j][k] / n;
      for (var k = 0; k < h; k++) b1[k] -= this.lr * gb1[k] / n;
      for (var k = 0; k < h; k++) for (var j = 0; j < p; j++) W2[k][j] -= this.lr * gW2[k][j] / n;
      for (var j = 0; j < p; j++) b2[j] -= this.lr * gb2[j] / n;
    }

    this.W1 = W1; this.b1 = b1; this.W2 = W2; this.b2 = b2;
  };

  Autoencoder.prototype.reconstructionError = function (data) {
    var self = this, p = data[0].length, h = this.hidden;
    return data.map(function (x) {
      var a1 = new Array(h);
      for (var k = 0; k < h; k++) { var s = self.b1[k]; for (var j = 0; j < p; j++) s += x[j] * self.W1[j][k]; a1[k] = sigmoid(s); }
      var err = 0;
      for (var j = 0; j < p; j++) { var o = self.b2[j]; for (var k2 = 0; k2 < h; k2++) o += a1[k2] * self.W2[k2][j]; var d = o - x[j]; err += d * d; }
      return err;
    });
  };

  App.Analysis.autoencoder = {
    Autoencoder: Autoencoder,
    fitAndScore: function (data, opts) {
      var ae = new Autoencoder(opts);
      ae.fit(data);
      return { ae: ae, scores: ae.reconstructionError(data) };
    }
  };
})(window);
