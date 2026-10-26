/* Vista: Datos (CRUD) — placeholder, se completa en F2. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.views = App.views || {};

  App.views.crud = function () {
    var t = App.i18n.t.bind(App.i18n);
    if (!App.store.isLoaded()) {
      return App.dom.el('div', { class: 'card empty-state' }, [
        App.dom.el('p', { text: 'No hay base de datos cargada.' }),
        App.dom.el('a', { class: 'btn btn-primary', href: '#/inicio' }, ['Cargar base de datos'])
      ]);
    }

    var s = App.store.summary();
    var entities = [
      { key: 'zones', label: 'Zonas' },
      { key: 'transformers', label: 'Transformadores' },
      { key: 'meters', label: 'Medidores' },
      { key: 'labels', label: 'Etiquetas de fraude' },
      { key: 'alerts', label: 'Alertas' }
    ];

    var rows = entities.map(function (e) {
      return { entidad: e.label, registros: (App.store.dataset[e.key] || []).length };
    });

    return App.dom.el('div', {}, [
      App.dom.el('div', { class: 'view-head' }, [
        App.dom.el('h2', { text: 'Datos (CRUD)' }),
        App.dom.el('p', { class: 'subtitle', text: t('crudPlaceholder') })
      ]),
      App.dom.el('div', { class: 'card' }, [
        App.ui.dataTable({
          columns: [
            { key: 'entidad', label: 'Entidad' },
            { key: 'registros', label: 'Registros' }
          ],
          rows: rows
        })
      ])
    ]);
  };
})(window);
