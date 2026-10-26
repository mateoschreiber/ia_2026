/* Vista: Dashboard completo (F4).

   Secciones: KPIs, pronóstico de pico por zona, ranking de medidores por
   riesgo, curva de carga (con selector de medidor) y tabla de alertas.
   Filtros: zona y tipo de cliente. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.views = App.views || {};

  var COLORS = {
    accent: '#f0b429',
    info: '#58a6ff',
    danger: '#f85149',
    warn: '#d29922',
    ok: '#3fb950',
    text: '#e6edf3',
    muted: '#93a1b1',
    grid: 'rgba(42,52,65,0.6)'
  };

  function byId(list, id) {
    for (var i = 0; i < list.length; i++) if (list[i].id === id) return list[i];
    return null;
  }

  function meterZone(dataset, meterId) {
    var m = byId(dataset.meters || [], meterId);
    if (!m) return null;
    var t = byId(dataset.transformers || [], m.transformerId);
    if (!t) return null;
    return byId(dataset.zones || [], t.zoneId);
  }

  function typeLabel(t) {
    return { residencial: 'Residencial', comercial: 'Comercial', industrial: 'Industrial' }[t] || t;
  }

  function severityClass(sev) {
    return { baja: 'ok', media: 'warn', alta: 'danger', critica: 'danger' }[sev] || 'ok';
  }

  function pad(n) { return (n < 10 ? '0' : '') + n; }

  function seriesMap(dataset) {
    var m = {};
    (dataset.readings || []).forEach(function (r) { m[r.meterId] = r.kwh; });
    return m;
  }

  function topMeters(dataset, filters, k) {
    var smap = seriesMap(dataset);
    var det = (dataset.detections || []).slice().sort(function (a, b) { return b.score - a.score; });
    var out = [];
    for (var i = 0; i < det.length; i++) {
      var d = det[i];
      var meter = byId(dataset.meters || [], d.meterId);
      if (!meter) continue;
      if (filters.type !== 'all' && meter.customerType !== filters.type) continue;
      var zone = meterZone(dataset, d.meterId);
      if (filters.zone !== 'all' && (!zone || zone.id !== filters.zone)) continue;
      out.push({ detection: d, meter: meter, zone: zone, series: smap[d.meterId] });
      if (out.length >= k) break;
    }
    return out;
  }

  function transformerMeanSeries(dataset, meterId) {
    var meter = byId(dataset.meters || [], meterId);
    if (!meter) return null;
    var smap = seriesMap(dataset);
    var members = (dataset.meters || []).filter(function (x) { return x.transformerId === meter.transformerId; });
    var agg = new Array(8760);
    for (var i = 0; i < 8760; i++) agg[i] = 0;
    var count = 0;
    members.forEach(function (x) {
      var k = smap[x.id];
      if (!k) return;
      for (var i = 0; i < 8760; i++) agg[i] += k[i];
      count++;
    });
    if (!count) return null;
    return agg.map(function (v) { return v / count; });
  }

  function hottestWeekStart(dataset) {
    var tempC = (dataset.weather && dataset.weather.tempC) || [];
    var best = -Infinity, start = 0;
    for (var d = 0; d + 7 <= 365; d++) {
      var s = 0;
      for (var h = 0; h < 168; h++) s += tempC[d * 24 + h];
      if (s > best) { best = s; start = d * 24; }
    }
    return start;
  }

  App.views.dashboard = function () {
    if (!App.store.isLoaded()) {
      return App.dom.el('div', { class: 'card empty-state' }, [
        App.dom.el('p', { text: 'No hay base de datos cargada.' }),
        App.dom.el('a', { class: 'btn btn-primary', href: '#/inicio' }, ['Cargar base de datos'])
      ]);
    }

    var dataset = App.store.dataset;
    var container = App.dom.el('div', { class: 'dashboard' });
    var state = { zone: 'all', type: 'all', meter: null };
    var charts = [];

    function destroyCharts() {
      charts.forEach(function (c) { App.ui.destroyChart(c); });
      charts = [];
    }

    function makeChart(canvas, config) {
      var c = App.ui.createChart(canvas, config);
      if (c) charts.push(c);
      return c;
    }

    function render() {
      destroyCharts();
      App.dom.clear(container);
      container.appendChild(build(state, makeChart));
    }

    function build() {
      var topAll = topMeters(dataset, { zone: 'all', type: 'all' }, 100);
      if (!state.meter && topAll.length) state.meter = topAll[0].meter.id;

      return App.dom.el('div', {}, [
        App.dom.el('div', { class: 'view-head' }, [
          App.dom.el('h2', { text: 'Dashboard de supervisión energética' }),
          App.dom.el('p', { class: 'subtitle', text: 'Datos emulados · 100 medidores · 1 año horario' })
        ]),
        renderFilters(),
        renderKpis(),
        App.dom.el('div', { class: 'grid grid-2', style: 'margin-top:16px;' }, [
          renderForecast(),
          renderRanking()
        ]),
        renderLoadCurve(),
        renderAlerts()
      ]);
    }

    function renderFilters() {
      var zoneSel = App.dom.el('select', { class: 'select', onchange: function (ev) {
        state.zone = ev.target.value; render();
      }}, [
        App.dom.el('option', { value: 'all', text: 'Todas las zonas' })
      ].concat((dataset.zones || []).map(function (z) {
        var o = App.dom.el('option', { value: z.id, text: z.name });
        if (state.zone === z.id) o.selected = true;
        return o;
      })));

      var typeSel = App.dom.el('select', { class: 'select', onchange: function (ev) {
        state.type = ev.target.value; render();
      }}, [
        App.dom.el('option', { value: 'all', text: 'Todos los tipos' }),
        App.dom.el('option', { value: 'residencial', text: 'Residencial' }),
        App.dom.el('option', { value: 'comercial', text: 'Comercial' }),
        App.dom.el('option', { value: 'industrial', text: 'Industrial' })
      ]);
      if (state.type !== 'all') typeSel.value = state.type;

      return App.dom.el('div', { class: 'filters-row' }, [
        App.dom.el('span', { class: 'muted', text: 'Filtros:' }),
        zoneSel, typeSel
      ]);
    }

    function renderKpis() {
      var det = dataset.detections || [];
      var fc = dataset.forecast || [];
      var alerts = dataset.alerts || [];

      var peakMax = 0;
      fc.forEach(function (f) { if (f.peakKw > peakMax) peakMax = f.peakKw; });
      var riskCount = det.filter(function (d) { return d.flag; }).length;
      var overload = alerts.filter(function (a) { return a.type === 'sobrecarga'; }).length;

      return App.dom.el('div', { class: 'grid grid-4', style: 'margin-top:16px;' }, [
        App.ui.kpiCard({ label: 'Pico pronosticado (máx)', value: App.dom.fmtNumber(peakMax, 1) + ' kW', hint: 'Percentil 95 por zona' }),
        App.ui.kpiCard({ label: 'Medidores en riesgo', value: riskCount, hint: 'Flag por score ≥ percentil 90', tone: riskCount ? 'warn' : null }),
        App.ui.kpiCard({ label: 'Alertas', value: alerts.length, tone: alerts.length ? 'danger' : null }),
        App.ui.kpiCard({ label: 'Sobrecargas', value: overload, tone: overload ? 'danger' : null })
      ]);
    }

    function renderForecast() {
      var fc = dataset.forecast || [];
      var card = App.dom.el('div', { class: 'card' }, [
        App.dom.el('h3', { text: 'Pronóstico de pico por zona' }),
        fc.length ? App.dom.el('div', { style: 'height:260px;' }, [
          App.dom.el('canvas', { class: 'chart-canvas', height: '260' })
        ]) : App.dom.el('p', { class: 'muted', text: 'Sin pronóstico.' })
      ]);

      if (!fc.length) return card;

      var canvas = card.querySelector('canvas');
      makeChart(canvas, {
        type: 'bar',
        data: {
          labels: fc.map(function (f) { return f.zoneName; }),
          datasets: [
            { label: 'Pico pronosticado (P95)', data: fc.map(function (f) { return f.peakKw; }), backgroundColor: COLORS.accent },
            { label: 'Línea base', data: fc.map(function (f) { return f.baselineKw; }), backgroundColor: COLORS.info }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: COLORS.text } } },
          scales: {
            x: { ticks: { color: COLORS.muted }, grid: { color: COLORS.grid } },
            y: { ticks: { color: COLORS.muted }, grid: { color: COLORS.grid }, title: { display: true, text: 'kW', color: COLORS.muted } }
          }
        }
      });
      return card;
    }

    function renderRanking() {
      var top = topMeters(dataset, state, 12);

      if (!top.length) {
        return App.dom.el('div', { class: 'card' }, [
          App.dom.el('h3', { text: 'Medidores en riesgo (top)' }),
          App.dom.el('p', { class: 'muted', text: 'Sin detecciones para los filtros actuales.' })
        ]);
      }

      var rows = top.map(function (item, idx) {
        var d = item.detection;
        var pct = Math.round(d.score * 100);
        return App.dom.el('tr', {}, [
          App.dom.el('td', { text: String(idx + 1) }),
          App.dom.el('td', { class: 'mono', text: d.meterId }),
          App.dom.el('td', { text: item.zone ? item.zone.name : '—' }),
          App.dom.el('td', { text: typeLabel(item.meter.customerType) }),
          App.dom.el('td', {}, [
            App.dom.el('div', { class: 'risk-cell' }, [
              App.dom.el('div', { class: 'risk-bar' }, [
                App.dom.el('div', { class: 'risk-bar-fill', style: 'width:' + pct + '%' })
              ]),
              App.dom.el('span', { class: 'mono', text: d.score.toFixed(2) })
            ])
          ]),
          App.dom.el('td', {}, [
            App.dom.el('span', { class: 'badge ' + (d.flag ? 'danger' : 'ok'), text: d.flag ? 'riesgo' : 'normal' })
          ]),
          App.dom.el('td', {}, [
            App.dom.el('button', { class: 'btn btn-sm', onclick: function () { state.meter = d.meterId; render(); } }, ['Ver'])
          ])
        ]);
      });

      var table = App.dom.el('table', { class: 'data-table' }, [
        App.dom.el('thead', {}, [App.dom.el('tr', {}, ['#', 'Medidor', 'Zona', 'Tipo', 'Score', 'Estado', ''].map(function (h) {
          return App.dom.el('th', { text: h });
        }))]),
        App.dom.el('tbody', {}, rows)
      ]);

      return App.dom.el('div', { class: 'card' }, [
        App.dom.el('h3', { text: 'Medidores en riesgo (top 12)' }),
        App.dom.el('div', { class: 'table-wrap' }, [table])
      ]);
    }

    function renderLoadCurve() {
      var smap = seriesMap(dataset);
      var meter = byId(dataset.meters || [], state.meter);
      if (!meter) {
        return App.dom.el('div', { class: 'card' }, [App.dom.el('h3', { text: 'Curva de carga' }), App.dom.el('p', { class: 'muted', text: 'Sin medidor seleccionado.' })]);
      }

      var meterSel = App.dom.el('select', { class: 'select', onchange: function (ev) { state.meter = ev.target.value; render(); } },
        (dataset.meters || []).map(function (m) {
          var o = App.dom.el('option', { value: m.id, text: m.id + ' · ' + typeLabel(m.customerType) });
          if (m.id === state.meter) o.selected = true;
          return o;
        }));

      var det = null;
      (dataset.detections || []).forEach(function (d) { if (d.meterId === state.meter) det = d; });
      var flagged = det && det.flag;

      var chartHost = App.dom.el('div', { style: 'height:280px;' }, [
        App.dom.el('canvas', { class: 'chart-canvas', height: '280' })
      ]);

      var mSeries = smap[state.meter];
      var nbSeries = transformerMeanSeries(dataset, state.meter);
      if (mSeries && nbSeries) {
        var start = hottestWeekStart(dataset);
        var len = 168;
        var base = new Date(dataset.weather && dataset.weather.start ? dataset.weather.start : '2025-01-01T00:00:00');
        var labels = [];
        for (var i = 0; i < len; i++) {
          var d = new Date(base.getTime() + (start + i) * 3600000);
          labels.push(pad(d.getDate()) + '/' + pad(d.getMonth() + 1) + ' ' + pad(d.getHours()) + 'h');
        }
        var slice = function (arr) { return arr.slice(start, start + len); };

        makeChart(chartHost.querySelector('canvas'), {
          type: 'line',
          data: {
            labels: labels,
            datasets: [
              { label: 'Medidor ' + state.meter, data: slice(mSeries), borderColor: COLORS.accent, backgroundColor: 'rgba(240,180,41,0.10)', borderWidth: 2, pointRadius: 0, tension: 0.25, fill: true },
              { label: 'Media del transformador', data: slice(nbSeries), borderColor: COLORS.info, borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, tension: 0.25, fill: false }
            ]
          },
          options: {
            responsive: true, maintainAspectRatio: false,
            plugins: { legend: { labels: { color: COLORS.text } } },
            scales: {
              x: { ticks: { color: COLORS.muted, maxTicksLimit: 12, autoSkip: true }, grid: { color: COLORS.grid } },
              y: { ticks: { color: COLORS.muted }, grid: { color: COLORS.grid } }
            }
          }
        });
      }

      return App.dom.el('div', { class: 'card', style: 'margin-top:16px;' }, [
        App.dom.el('div', { style: 'display:flex; align-items:center; gap:12px; flex-wrap:wrap;' }, [
          App.dom.el('h3', { text: 'Curva de carga (semana más calurosa)' }),
          meterSel,
          flagged ? App.dom.el('span', { class: 'badge danger', text: 'Marcado en riesgo' }) : null
        ]),
        chartHost
      ]);
    }

    function renderAlerts() {
      var alerts = (dataset.alerts || []).slice();
      if (state.zone !== 'all') {
        alerts = alerts.filter(function (a) {
          var z = null;
          if (a.meterId) z = meterZone(dataset, a.meterId);
          else if (a.transformerId) {
            var t = byId(dataset.transformers || [], a.transformerId);
            if (t) z = byId(dataset.zones || [], t.zoneId);
          }
          return z && z.id === state.zone;
        });
      }
      alerts.sort(function (a, b) {
        var order = { critica: 0, alta: 1, media: 2, baja: 3 };
        return (order[a.severity] || 9) - (order[b.severity] || 9);
      });

      var rows = alerts.map(function (a) {
        var target = '—';
        if (a.meterId) {
          var m = byId(dataset.meters || [], a.meterId);
          target = 'Medidor ' + a.meterId + (m ? ' (' + typeLabel(m.customerType) + ')' : '');
        } else if (a.transformerId) {
          var t = byId(dataset.transformers || [], a.transformerId);
          target = 'Trafo ' + a.transformerId + (t ? ' (' + t.name + ')' : '');
        }
        return App.dom.el('tr', {}, [
          App.dom.el('td', {}, [App.dom.el('span', { class: 'badge ' + severityClass(a.severity), text: a.severity })]),
          App.dom.el('td', { text: a.type }),
          App.dom.el('td', { class: 'mono', text: target }),
          App.dom.el('td', { text: a.message })
        ]);
      });

      var table = App.dom.el('table', { class: 'data-table' }, [
        App.dom.el('thead', {}, [App.dom.el('tr', {}, ['Severidad', 'Tipo', 'Destino', 'Mensaje'].map(function (h) {
          return App.dom.el('th', { text: h });
        }))]),
        App.dom.el('tbody', {}, rows)
      ]);

      return App.dom.el('div', { class: 'card', style: 'margin-top:16px;' }, [
        App.dom.el('h3', { text: 'Alertas (' + alerts.length + ')' }),
        alerts.length ? App.dom.el('div', { class: 'table-wrap' }, [table]) : App.dom.el('p', { class: 'muted', text: 'Sin alertas.' })
      ]);
    }

    render();
    return container;
  };
})(window);
