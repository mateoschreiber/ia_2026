/* Vista: Métricas del modelo — placeholder, se completa en F5. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.views = App.views || {};

  App.views.metrics = function () {
    var t = App.i18n.t.bind(App.i18n);
    return App.dom.el('div', {}, [
      App.dom.el('div', { class: 'view-head' }, [
        App.dom.el('h2', { text: 'Métricas del modelo' }),
        App.dom.el('p', { class: 'subtitle', text: t('metricsPlaceholder') })
      ]),
      App.dom.el('div', { class: 'card empty-state' }, [
        App.dom.el('p', { text: 'precision@k, recall y curva de inspección se mostrarán aquí (F5).' })
      ])
    ]);
  };
})(window);
