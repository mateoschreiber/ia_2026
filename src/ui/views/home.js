/* Vista: Inicio (cargar base de datos y resumen). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.views = App.views || {};

  function renderEmpty() {
    var t = App.i18n.t.bind(App.i18n);
    var dropzone = App.dom.el('div', { class: 'dropzone' }, [
      App.dom.el('h3', { text: t('loadTitle') }),
      App.dom.el('p', { class: 'muted' }, [t('loadHint'), ' ',
        App.dom.el('code', { text: 'data/database.json' })]),
      App.dom.el('p', { class: 'muted', style: 'margin-top:6px;' }, [t('loadOr')])
    ]);

    var openBtn = App.dom.el('button', {
      class: 'btn btn-primary',
      onclick: function () { App.fileStore.open(); }
    }, [t('openDb')]);

    return App.dom.el('div', {}, [
      App.dom.el('div', { class: 'view-head' }, [
        App.dom.el('h2', { text: t('appName') }),
        App.dom.el('p', { class: 'subtitle', text: 'Detección de pérdidas no técnicas y predicción de picos de consumo.' })
      ]),
      App.dom.el('div', { class: 'card' }, [dropzone, App.dom.el('div', { class: 'btn-row' }, [openBtn])])
    ]);
  }

  function renderLoaded() {
    var t = App.i18n.t.bind(App.i18n);
    var s = App.store.summary();
    var fileName = App.store.fileName || t('cache');

    var kpis = App.dom.el('div', { class: 'grid grid-4' }, [
      App.ui.kpiCard({ label: t('zones'), value: s.zones }),
      App.ui.kpiCard({ label: t('transformers'), value: s.transformers }),
      App.ui.kpiCard({ label: t('meters'), value: s.meters }),
      App.ui.kpiCard({ label: t('alerts'), value: s.alerts, tone: s.alerts ? 'warn' : null })
    ]);

    var actions = App.dom.el('div', { class: 'btn-row' }, [
      App.dom.el('button', { class: 'btn btn-primary', onclick: function () { App.fileStore.open(); } }, [t('openDb')]),
      App.dom.el('button', { class: 'btn', onclick: function () { App.fileStore.save(); } }, [t('saveDb')]),
      App.dom.el('button', { class: 'btn', onclick: function () { App.fileStore.download(); } }, [t('downloadDb')]),
      App.dom.el('button', { class: 'btn btn-danger', onclick: function () { App.store.reset(); } }, [t('resetDb')]),
      App.dom.el('a', { class: 'btn btn-primary', href: '#/dashboard' }, [t('goDashboard')])
    ]);

    return App.dom.el('div', {}, [
      App.dom.el('div', { class: 'view-head' }, [
        App.dom.el('h2', { text: t('loadedTitle') }),
        App.dom.el('p', { class: 'subtitle' }, [
          t('fileName'), ': ', App.dom.el('code', { text: fileName })
        ])
      ]),
      kpis,
      App.dom.el('div', { class: 'card', style: 'margin-top:16px;' }, [
        App.dom.el('h3', { text: t('datasetSummary') }),
        App.dom.el('p', { class: 'muted' }, [
          s.readings + ' ' + t('readings').toLowerCase() + ' · ' + s.detections + ' ' + t('detections').toLowerCase()
        ]),
        actions
      ])
    ]);
  }

  App.views.home = function () {
    return App.store.isLoaded() ? renderLoaded() : renderEmpty();
  };
})(window);
