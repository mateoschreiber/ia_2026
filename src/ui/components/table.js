/* Componente: tabla de datos. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.ui = App.ui || {};

  // opts: { columns: [{key,label,render?}], rows: [objetos], empty: string }
  function dataTable(opts) {
    opts = opts || {};
    var columns = opts.columns || [];
    var rows = opts.rows || [];

    if (!rows.length) {
      return App.dom.el('div', { class: 'empty-state', text: opts.empty || 'Sin datos.' });
    }

    var thead = App.dom.el('thead', {}, [
      App.dom.el('tr', {}, columns.map(function (c) {
        return App.dom.el('th', { text: c.label || c.key });
      }))
    ]);

    var tbody = App.dom.el('tbody', {}, rows.map(function (row) {
      return App.dom.el('tr', {}, columns.map(function (c) {
        var value = row[c.key];
        var cell = (c.render && typeof c.render === 'function')
          ? c.render(value, row)
          : (value === undefined || value === null ? '—' : String(value));
        return App.dom.el('td', {}, [cell]);
      }));
    }));

    return App.dom.el('div', { class: 'table-wrap' }, [
      App.dom.el('table', { class: 'data-table' }, [thead, tbody])
    ]);
  }

  App.ui.dataTable = dataTable;
})(window);
