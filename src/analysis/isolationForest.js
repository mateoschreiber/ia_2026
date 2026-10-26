/* Isolation Forest (implementación completa en JS).

   Referencia: Liu, Ting & Zhou, "Isolation Forest", ICDM 2008.
   Un punto con camino promedio corto a través de los árboles es anómalo. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  var EULER = 0.5772156649;

  function cFactor(n) {
    if (n <= 1) return 0;
    if (n === 2) return 1;
    return 2 * Math.log(n - 1) + EULER - (2 * (n - 1)) / n;
  }

  function IsolationForest(opts) {
    opts = opts || {};
    this.nTrees = opts.nTrees || 100;
    this.subsample = opts.subsample || 256;
    this.limit = opts.limit || 0;
    this.rng = opts.rng || App.Analysis.rng.makeRng(opts.seed);
    this.trees = [];
    this.c = 0;
  }

  IsolationForest.prototype._buildTree = function (data, indices, depth, limit) {
    var n = indices.length;
    if (n <= 1) return { isLeaf: true, size: n };
    if (depth >= limit) return { isLeaf: true, size: n };

    var p = data[0].length;
    var feature = this.rng.int(p);
    var mn = Infinity, mx = -Infinity;
    for (var i = 0; i < n; i++) {
      var v = data[indices[i]][feature];
      if (v < mn) mn = v;
      if (v > mx) mx = v;
    }
    if (mx - mn < 1e-12) return { isLeaf: true, size: n };

    var split = mn + this.rng.random() * (mx - mn);
    var left = [], right = [];
    for (var j = 0; j < n; j++) {
      if (data[indices[j]][feature] < split) left.push(indices[j]);
      else right.push(indices[j]);
    }
    if (!left.length || !right.length) return { isLeaf: true, size: n };

    return {
      isLeaf: false,
      feature: feature,
      split: split,
      left: this._buildTree(data, left, depth + 1, limit),
      right: this._buildTree(data, right, depth + 1, limit)
    };
  };

  IsolationForest.prototype.fit = function (data) {
    var n = data.length;
    if (!n) return this;
    var subsample = Math.min(this.subsample, n);
    var limit = this.limit || Math.ceil(Math.log2(Math.max(subsample, 2)));
    this.trees = [];
    for (var t = 0; t < this.nTrees; t++) {
      var pool = [];
      for (var i = 0; i < n; i++) pool.push(i);
      var indices = [];
      for (var s = 0; s < subsample; s++) {
        var k = this.rng.int(pool.length);
        indices.push(pool[k]);
        pool[k] = pool[pool.length - 1];
        pool.pop();
      }
      this.trees.push(this._buildTree(data, indices, 0, limit));
    }
    this.c = cFactor(subsample);
    return this;
  };

  IsolationForest.prototype._pathLength = function (x, tree, depth) {
    if (tree.isLeaf) return depth + cFactor(tree.size);
    if (x[tree.feature] < tree.split) return this._pathLength(x, tree.left, depth + 1);
    return this._pathLength(x, tree.right, depth + 1);
  };

  // Mayor score (cercano a 1) = más anómalo.
  IsolationForest.prototype.score = function (data) {
    var self = this;
    return data.map(function (x) {
      var sum = 0;
      for (var t = 0; t < self.trees.length; t++) sum += self._pathLength(x, self.trees[t], 0);
      var avg = sum / self.trees.length;
      return Math.pow(2, -avg / self.c);
    });
  };

  App.Analysis.isolationForest = {
    IsolationForest: IsolationForest,
    fitAndScore: function (data, opts) {
      var forest = new IsolationForest(opts);
      forest.fit(data);
      return { forest: forest, scores: forest.score(data) };
    }
  };
})(window);
