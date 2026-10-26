/* Vista: Métricas del modelo (F5).

   Evalúa las detecciones contra las etiquetas (ground truth) y muestra
   matriz de confusión, precision@k, recall, curva de inspección y el
   desempeño por arquetipo de fraude. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.views = App.views || {};

  var COLORS = {
    accent: '#f0b429', info: '#58a6ff', danger: '#f85149', warn: '#d29922',
    ok: '#3fb950', text: '#e6edf3', muted: '#93a1b1', grid: 'rgba(42,52,65,0.6)'
  };

  function pct(x) { return Math.round(x * 100) + '%'; }

  App.views.metrics = function () {
    if (!App.store.isLoaded()) {
      return App.dom.el('div', { class: 'card empty-state' }, [
        App.dom.el('p', { text: 'No hay base de datos cargada.' }),
        App.dom.el('a', { class: 'btn btn-primary', href: '#/inicio' }, ['Cargar base de datos'])
      ]);
    }

    var dataset = App.store.dataset;
    var m = App.Analysis.metrics.evaluate(dataset);
    var container = App.dom.el('div', { class: 'metrics' });

    function atK(k) {
      for (var i = 0; i < m.atK.length; i++) if (m.atK[i].k === k) return m.atK[i];
      return null;
    }

    function kpis() {
      var p10 = atK(10), r30 = atK(30);
      return App.dom.el('div', { class: 'grid grid-4' }, [
        App.ui.kpiCard({ label: 'Fraude real (etiquetas)', value: m.fraudTotal, hint: 'Ground truth oculto en el dashboard' }),
        App.ui.kpiCard({ label: 'Marcados en riesgo', value: m.thresholdFlags, hint: 'flag = score ≥ percentil 90', tone: 'warn' }),
        App.ui.kpiCard({ label: 'Precision@10', value: pct(p10 ? p10.precision : 0), hint: p10 ? p10.hits + ' de ' + p10.k + ' correctos' : '' }),
        App.ui.kpiCard({ label: 'Recall@30', value: pct(r30 ? r30.recall : 0), hint: r30 ? r30.hits + ' de ' + m.fraudTotal + ' fraudes' : '' })
      ]);
    }

    function confusion() {
      var c = m.confusion;
      function cell(text, cls) { return App.dom.el('td', { class: cls || '', text: text }); }

      var table = App.dom.el('table', { class: 'data-table' }, [
        App.dom.el('thead', {}, [App.dom.el('tr', {}, ['', 'Real: fraude', 'Real: normal'].map(function (h) { return App.dom.el('th', { text: h }); }))]),
        App.dom.el('tbody', {}, [
          App.dom.el('tr', {}, [
            App.dom.el('td', { text: 'Pred: riesgo' }),
            App.dom.el('td', {}, [App.dom.el('strong', { text: String(c.tp) }), ' (TP)']),
            App.dom.el('td', {}, [App.dom.el('strong', { text: String(c.fp) }), ' (FP)'])
          ]),
          App.dom.el('tr', {}, [
            App.dom.el('td', { text: 'Pred: normal' }),
            App.dom.el('td', {}, [App.dom.el('strong', { text: String(c.fn) }), ' (FN)']),
            App.dom.el('td', {}, [App.dom.el('strong', { text: String(c.tn) }), ' (TN)'])
          ])
        ])
      ]);

      var stats = App.dom.el('div', { class: 'metrics-stats' }, [
        App.dom.el('div', {}, [App.dom.el('span', { class: 'muted', text: 'Precision' }), App.dom.el('strong', { text: m.precision.toFixed(3) })]),
        App.dom.el('div', {}, [App.dom.el('span', { class: 'muted', text: 'Recall' }), App.dom.el('strong', { text: m.recall.toFixed(3) })]),
        App.dom.el('div', {}, [App.dom.el('span', { class: 'muted', text: 'F1' }), App.dom.el('strong', { text: m.f1.toFixed(3) })]),
        App.dom.el('div', {}, [App.dom.el('span', { class: 'muted', text: 'Accuracy' }), App.dom.el('strong', { text: m.accuracy.toFixed(3) })])
      ]);

      return App.dom.el('div', { class: 'card' }, [
        App.dom.el('h3', { text: 'Matriz de confusión' }),
        App.dom.el('div', { class: 'table-wrap' }, [table]),
        stats
      ]);
    }

    function precisionTable() {
      var rows = m.atK.map(function (r) {
        return App.dom.el('tr', {}, [
          App.dom.el('td', { text: 'Top ' + r.k }),
          App.dom.el('td', { text: r.hits + ' / ' + m.fraudTotal }),
          App.dom.el('td', { text: r.precision.toFixed(3) }),
          App.dom.el('td', { text: r.recall.toFixed(3) })
        ]);
      });
      var table = App.dom.el('table', { class: 'data-table' }, [
        App.dom.el('thead', {}, [App.dom.el('tr', {}, ['Revisados', 'Fraudes hallados', 'Precision', 'Recall'].map(function (h) { return App.dom.el('th', { text: h }); }))]),
        App.dom.el('tbody', {}, rows)
      ]);
      return App.dom.el('div', { class: 'card' }, [
        App.dom.el('h3', { text: 'Precision y recall por cantidad de inspecciones' }),
        App.dom.el('div', { class: 'table-wrap' }, [table])
      ]);
    }

    function inspectionCurve() {
      var card = App.dom.el('div', { class: 'card' }, [
        App.dom.el('h3', { text: 'Curva de inspección (fraudes encontrados vs revisados)' }),
        App.dom.el('div', { style: 'height:260px;' }, [App.dom.el('canvas', { class: 'chart-canvas', height: '260' })])
      ]);

      var ks = m.curve.map(function (c) { return c.k; });
      var hits = m.curve.map(function (c) { return c.hits; });
      var prevalence = m.fraudTotal / (m.n || 1);
      var random = ks.map(function (k) { return Math.round(k * prevalence * 100) / 100; });

      App.ui.createChart(card.querySelector('canvas'), {
        type: 'line',
        data: {
          labels: ks,
          datasets: [
            { label: 'Modelo (acumulado)', data: hits, borderColor: COLORS.accent, backgroundColor: 'rgba(240,180,41,0.10)', borderWidth: 2, pointRadius: 0, fill: true },
            { label: 'Aleatorio esperado', data: random, borderColor: COLORS.muted, borderWidth: 1.5, borderDash: [4, 4], pointRadius: 0, fill: false }
          ]
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          plugins: { legend: { labels: { color: COLORS.text } } },
          scales: {
            x: { ticks: { color: COLORS.muted }, grid: { color: COLORS.grid }, title: { display: true, text: 'medidores revisados', color: COLORS.muted } },
            y: { ticks: { color: COLORS.muted, precision: 0 }, grid: { color: COLORS.grid }, title: { display: true, text: 'fraudes encontrados', color: COLORS.muted } }
          }
        }
      });
      return card;
    }

    function archetypeTable() {
      var rows = m.archetypes.map(function (a) {
        var detected = a.rank <= 10;
        return App.dom.el('tr', {}, [
          App.dom.el('td', { text: a.archetype }),
          App.dom.el('td', { class: 'mono', text: a.meterId }),
          App.dom.el('td', { text: '#' + a.rank }),
          App.dom.el('td', { class: 'mono', text: a.score === null ? '—' : a.score.toFixed(3) }),
          App.dom.el('td', {}, [App.dom.el('span', { class: 'badge ' + (detected ? 'ok' : 'danger'), text: detected ? 'top 10' : 'no detectado' })]),
          App.dom.el('td', {}, [App.dom.el('span', { class: 'badge ' + (a.flag ? 'danger' : 'ok'), text: a.flag ? 'flag' : '—' })])
        ]);
      });
      var table = App.dom.el('table', { class: 'data-table' }, [
        App.dom.el('thead', {}, [App.dom.el('tr', {}, ['Arquetipo', 'Medidor', 'Rank', 'Score', 'En top 10', 'Flag'].map(function (h) { return App.dom.el('th', { text: h }); }))]),
        App.dom.el('tbody', {}, rows)
      ]);
      return App.dom.el('div', { class: 'card' }, [
        App.dom.el('h3', { text: 'Desempeño por arquetipo de fraude' }),
        App.dom.el('div', { class: 'table-wrap' }, [table]),
        App.dom.el('p', { class: 'muted', style: 'margin-top:10px;', text: 'Los arquetipos "evidentes" (bypass total, inversión de fase, manipulación nocturna) suelen quedar en el top; los de escalado uniforme o intermitentes son más difíciles, como en la literatura.' })
      ]);
    }

    container.appendChild(App.dom.el('div', {}, [
      App.dom.el('div', { class: 'view-head' }, [
        App.dom.el('h2', { text: 'Métricas del modelo' }),
        App.dom.el('p', { class: 'subtitle', text: 'Evaluación contra las etiquetas (ground truth) sobre datos emulados.' })
      ]),
      kpis(),
      App.dom.el('div', { class: 'grid grid-2', style: 'margin-top:16px;' }, [confusion(), precisionTable()]),
      App.dom.el('div', { class: 'grid grid-2', style: 'margin-top:16px;' }, [inspectionCurve(), archetypeTable()])
    ]));

    return container;
  };
})(window);
