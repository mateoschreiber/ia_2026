/* Vista: Dashboard (F0 — vista mínima, se completa en F4). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.views = App.views || {};

  function renderEmpty() {
    return App.dom.el('div', { class: 'card empty-state' }, [
      App.dom.el('p', { text: 'No hay base de datos cargada.' }),
      App.dom.el('a', { class: 'btn btn-primary', href: '#/inicio' }, ['Cargar base de datos'])
    ]);
  }

  function firstMeterSeries() {
    var ds = App.store.dataset;
    var meter = (ds.meters || [])[0];
    if (!meter) return null;
    var series = (ds.readings || []).filter(function (r) { return r.meterId === meter.id; })[0];
    if (!series || !series.kwh) return null;
    return { meter: meter, series: series };
  }

  function renderChart() {
    var item = firstMeterSeries();
    if (!item) return App.dom.el('p', { class: 'muted', text: 'Sin series de lecturas.' });

    var MAX = 336; // 2 semanas para mantener el F0 liviano
    var values = item.series.kwh.slice(0, MAX);
    var labels = values.map(function (_, i) { return i; });

    var canvas = App.dom.el('canvas', { class: 'chart-canvas', height: '260' });
    App.ui.createChart(canvas, {
      type: 'line',
      data: {
        labels: labels,
        datasets: [{
          label: 'Consumo ' + item.meter.id + ' (kWh)',
          data: values,
          borderColor: '#f0b429',
          backgroundColor: 'rgba(240,180,41,0.12)',
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { labels: { color: '#e6edf3' } } },
        scales: {
          x: { ticks: { color: '#93a1b1' }, grid: { color: 'rgba(42,52,65,0.6)' } },
          y: { ticks: { color: '#93a1b1' }, grid: { color: 'rgba(42,52,65,0.6)' } }
        }
      }
    });

    return App.dom.el('div', { style: 'height:280px;' }, [canvas]);
  }

  App.views.dashboard = function () {
    if (!App.store.isLoaded()) return renderEmpty();
    var t = App.i18n.t.bind(App.i18n);
    var s = App.store.summary();

    return App.dom.el('div', {}, [
      App.dom.el('div', { class: 'view-head' }, [
        App.dom.el('h2', { text: 'Dashboard' }),
        App.dom.el('p', { class: 'subtitle', text: t('dashboardPlaceholder') })
      ]),
      App.dom.el('div', { class: 'grid grid-4' }, [
        App.ui.kpiCard({ label: t('meters'), value: s.meters }),
        App.ui.kpiCard({ label: t('zones'), value: s.zones }),
        App.ui.kpiCard({ label: t('detections'), value: s.detections, tone: s.detections ? 'warn' : null }),
        App.ui.kpiCard({ label: t('alerts'), value: s.alerts, tone: s.alerts ? 'danger' : null })
      ]),
      App.dom.el('div', { class: 'card', style: 'margin-top:16px;' }, [
        App.dom.el('h3', { text: 'Curva de carga de ejemplo' }),
        renderChart()
      ])
    ]);
  };
})(window);
