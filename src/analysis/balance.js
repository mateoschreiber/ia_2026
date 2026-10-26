/* Balance energético: pérdidas = suministrado - facturado (señal de IA clásica). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.Analysis = App.Analysis || {};

  function computeBalance(suppliedKwh, billedKwh) {
    var supplied = Number(suppliedKwh) || 0;
    var billed = Number(billedKwh) || 0;
    var losses = supplied - billed;
    var lossPct = supplied > 0 ? (losses / supplied) * 100 : 0;
    return { supplied: supplied, billed: billed, losses: losses, lossPct: lossPct };
  }

  function transformerBalance(dataset) {
    var out = [];
    (dataset.transformers || []).forEach(function (t) {
      var billed = 0;
      (dataset.meters || []).forEach(function (m) {
        if (m.transformerId !== t.id) return;
        var series = (dataset.readings || []).filter(function (r) { return r.meterId === m.id; })[0];
        if (series && series.kwh) {
          series.kwh.forEach(function (v) { billed += Number(v) || 0; });
        }
      });
      var supplied = Number(t.energySuppliedKwh) || 0;
      out.push(Object.assign({}, computeBalance(supplied, billed), { transformerId: t.id, name: t.name }));
    });
    return out;
  }

  App.Analysis.balance = {
    computeBalance: computeBalance,
    transformerBalance: transformerBalance
  };
})(window);
