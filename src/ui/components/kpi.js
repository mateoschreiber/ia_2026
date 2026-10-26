/* Componente: tarjeta KPI. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.ui = App.ui || {};

  function kpiCard(opts) {
    opts = opts || {};
    var toneClass = opts.tone ? ' is-' + opts.tone : '';
    return App.dom.el('div', { class: 'card kpi-card' + toneClass }, [
      App.dom.el('div', { class: 'kpi-label', text: opts.label || '' }),
      App.dom.el('div', { class: 'kpi-value', text: opts.value === undefined ? '—' : String(opts.value) }),
      opts.hint ? App.dom.el('div', { class: 'kpi-hint', text: opts.hint }) : null
    ]);
  }

  App.ui.kpiCard = kpiCard;
})(window);
