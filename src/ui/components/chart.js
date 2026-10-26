/* Componente: gráfico (envoltorio de Chart.js con degradación elegante). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.ui = App.ui || {};

  function createChart(canvas, config) {
    if (!global.Chart) {
      canvas.replaceWith(App.dom.el('p', { class: 'muted', text: App.i18n.t('chartUnavailable') }));
      return null;
    }
    return new global.Chart(canvas, config);
  }

  function destroyChart(chart) {
    if (chart && typeof chart.destroy === 'function') chart.destroy();
  }

  App.ui.createChart = createChart;
  App.ui.destroyChart = destroyChart;
})(window);
