/* Vista: Datos (CRUD) — alta/edición/borrado por entidad (F2). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.views = App.views || {};

  var EDITABLE = [
    { key: 'zones', label: 'Zonas' },
    { key: 'transformers', label: 'Transformadores' },
    { key: 'meters', label: 'Medidores' },
    { key: 'labels', label: 'Etiquetas' },
    { key: 'alerts', label: 'Alertas' }
  ];

  function emptyState() {
    return App.dom.el('div', { class: 'card empty-state' }, [
      App.dom.el('p', { text: 'No hay base de datos cargada.' }),
      App.dom.el('a', { class: 'btn btn-primary', href: '#/inicio' }, ['Cargar base de datos'])
    ]);
  }

  App.views.crud = function () {
    if (!App.store.isLoaded()) return emptyState();

    var container = App.dom.el('div', { class: 'crud-root' });
    var state = { entity: 'meters', mode: 'list', editing: null, search: '' };
    var tabs = App.dom.el('div', { class: 'entity-tabs' });
    var toolbar = App.dom.el('div', { class: 'crud-toolbar' });
    var content = App.dom.el('div', { class: 'crud-content' });

    function notify(kind, msg) {
      App.bus.emit(App.EVENTS.NOTICE, { kind: kind, message: msg, at: Date.now() });
    }

    function fieldRule(field) {
      var schema = App.SCHEMA.entities;
      for (var ent in schema) {
        var r = schema[ent].fields[field];
        if (r) return r;
      }
      return null;
    }

    function displayValue(field, value) {
      if (value === undefined || value === null || value === '') return '—';
      var rule = fieldRule(field);
      if (rule && rule.type === 'boolean') {
        return App.dom.el('span', { class: 'badge ' + (value ? 'warn' : 'ok'), text: value ? 'sí' : 'no' });
      }
      if (rule && rule.ref) {
        var target = (App.store.dataset[rule.ref] || []).filter(function (x) { return x.id === value; })[0];
        return App.dom.el('span', { class: 'mono', text: value + (target && target.name ? ' (' + target.name + ')' : '') });
      }
      if (typeof value === 'number') return App.dom.fmtNumber(value, 2);
      return String(value);
    }

    function renderTabs() {
      App.dom.clear(tabs);
      EDITABLE.forEach(function (e) {
        var count = (App.store.dataset[e.key] || []).length;
        tabs.appendChild(App.dom.el('button', {
          class: 'entity-tab' + (state.entity === e.key ? ' is-active' : ''),
          onclick: function () {
            state.entity = e.key; state.mode = 'list'; state.editing = null; state.search = '';
            renderTabs(); renderToolbar(); renderContent();
          }
        }, [e.label + ' (' + count + ')']));
      });
    }

    function renderToolbar() {
      App.dom.clear(toolbar);
      var search = App.dom.el('input', {
        type: 'search', class: 'crud-search', placeholder: 'Buscar…', value: state.search,
        oninput: function (ev) { state.search = ev.target.value; renderContent(); }
      });
      var newBtn = App.dom.el('button', { class: 'btn btn-primary', onclick: function () {
        state.mode = 'form'; state.editing = null; renderContent();
      }}, ['Nuevo']);
      toolbar.appendChild(search);
      toolbar.appendChild(newBtn);
    }

    function renderContent() {
      App.dom.clear(content);
      content.appendChild(state.mode === 'form' ? renderForm() : renderList());
    }

    function renderList() {
      var def = App.SCHEMA.entities[state.entity];
      var all = App.repo.list(state.entity);
      var q = state.search.trim().toLowerCase();
      var rows = all;
      if (q) {
        rows = all.filter(function (r) {
          return Object.keys(r).some(function (k) {
            var v = r[k];
            return (typeof v === 'string' || typeof v === 'number') && String(v).toLowerCase().indexOf(q) !== -1;
          });
        });
      }

      var columns = Object.keys(def.fields).map(function (f) {
        return { key: f, label: App.ui.fieldLabel(f), render: function (value) { return displayValue(f, value); } };
      });
      columns.push({
        key: '__actions', label: 'Acciones',
        render: function (value, row) {
          return App.dom.el('div', { class: 'row-actions' }, [
            App.dom.el('button', { class: 'btn btn-sm', onclick: function () {
              state.mode = 'form'; state.editing = row; renderContent();
            }}, ['Editar']),
            App.dom.el('button', { class: 'btn btn-sm btn-danger', onclick: function () { doDelete(row); } }, ['Eliminar'])
          ]);
        }
      });

      return App.dom.el('div', {}, [
        App.dom.el('p', { class: 'muted', style: 'margin-bottom:10px;', text: rows.length + ' de ' + all.length + ' registro(s)' }),
        App.ui.dataTable({ columns: columns, rows: rows, empty: 'Sin registros.' })
      ]);
    }

    function renderForm() {
      var isEdit = !!state.editing;
      return App.ui.buildForm(state.entity, state.editing, {
        onSubmit: function (values) {
          var result = isEdit
            ? App.repo.update(state.entity, state.editing.id, values)
            : App.repo.create(state.entity, values);
          if (!result.ok) return { ok: false, errors: result.errors };
          notify('ok', (isEdit ? 'Actualizado ' : 'Creado ') + result.record.id);
          state.mode = 'list'; state.editing = null;
          renderContent();
          return { ok: true };
        },
        onCancel: function () { state.mode = 'list'; state.editing = null; renderContent(); }
      });
    }

    function doDelete(row) {
      if (!global.confirm('¿Eliminar este registro?')) return;
      var result = App.repo.remove(state.entity, row.id);
      if (!result.ok) { notify('error', result.errors[0]); return; }
      notify('ok', 'Eliminado ' + row.id);
      renderContent();
    }

    renderTabs();
    renderToolbar();
    renderContent();
    container.appendChild(tabs);
    container.appendChild(toolbar);
    container.appendChild(content);
    return container;
  };
})(window);
