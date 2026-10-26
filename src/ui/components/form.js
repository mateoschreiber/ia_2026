/* Componente: formulario de alta/edición generado desde el esquema. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});
  App.ui = App.ui || {};

  // Etiquetas legibles para los campos del esquema.
  var FIELD_LABELS = {
    id: 'ID',
    name: 'Nombre',
    description: 'Descripción',
    zoneId: 'Zona',
    transformerId: 'Transformador',
    meterId: 'Medidor',
    capacityKva: 'Capacidad (kVA)',
    energySuppliedKwh: 'Energía suministrada (kWh)',
    customerType: 'Tipo de cliente',
    tariff: 'Tarifa',
    capacityContractedKw: 'Capacidad contratada (kW)',
    active: 'Activo',
    isFraud: 'Pérdida no técnica',
    archetype: 'Arquetipo',
    note: 'Nota',
    type: 'Tipo',
    severity: 'Severidad',
    message: 'Mensaje',
    model: 'Modelo',
    score: 'Score',
    flag: 'Flag',
    createdAt: 'Creado'
  };

  function fieldLabel(field) {
    return FIELD_LABELS[field] || field;
  }

  function inputFor(field, rule, value, dataset) {
    if (rule.type === 'boolean') {
      var cb = App.dom.el('input', { type: 'checkbox', name: field });
      if (value) cb.checked = true;
      return cb;
    }

    if (rule.enum) {
      var sel = App.dom.el('select', { name: field }, rule.enum.map(function (opt) {
        var o = App.dom.el('option', { value: opt, text: opt });
        if (value === opt) o.selected = true;
        return o;
      }));
      return sel;
    }

    if (rule.ref) {
      var refOptions = [{ id: '', label: '— seleccionar —' }];
      (dataset[rule.ref] || []).forEach(function (x) {
        refOptions.push({ id: x.id, label: x.id + (x.name ? ' · ' + x.name : '') });
      });
      var s2 = App.dom.el('select', { name: field }, refOptions.map(function (o) {
        var opt = App.dom.el('option', { value: o.id, text: o.label });
        if (value === o.id) opt.selected = true;
        return opt;
      }));
      return s2;
    }

    if (rule.type === 'number') {
      return App.dom.el('input', {
        type: 'number', step: 'any', name: field,
        value: value === undefined || value === null ? '' : String(value)
      });
    }

    return App.dom.el('input', {
      type: 'text', name: field,
      value: value === undefined || value === null ? '' : String(value)
    });
  }

  // Devuelve un elemento <form>. opts: { onSubmit(values)->{ok,errors?}, onCancel() }
  function buildForm(entityName, record, opts) {
    opts = opts || {};
    var def = App.SCHEMA.entities[entityName];
    var dataset = App.store.dataset;
    var isEdit = !!record;
    var fields = Object.keys(def.fields).filter(function (f) { return f !== 'id'; });

    var errorBox = App.dom.el('div', { class: 'form-errors', style: 'display:none' });

    function showErrors(errors) {
      if (errors && errors.length) {
        errorBox.style.display = '';
        App.dom.clear(errorBox);
        errorBox.appendChild(App.dom.el('ul', {}, errors.map(function (e) {
          return App.dom.el('li', { text: e });
        })));
      } else {
        errorBox.style.display = 'none';
      }
    }

    var rows = fields.map(function (field) {
      var rule = def.fields[field];
      var value = record ? record[field] : undefined;
      return App.dom.el('label', { class: 'form-field' }, [
        App.dom.el('span', { class: 'form-label', text: fieldLabel(field) + (rule.required ? ' *' : '') }),
        inputFor(field, rule, value, dataset)
      ]);
    });

    var form = App.dom.el('form', { class: 'crud-form', onsubmit: function (ev) {
      ev.preventDefault();
      var values = {};
      fields.forEach(function (field) {
        var rule = def.fields[field];
        var input = form.querySelector('[name="' + field + '"]');
        if (!input) return;
        if (rule.type === 'boolean') values[field] = input.checked;
        else if (rule.type === 'number') values[field] = (input.value === '' ? undefined : Number(input.value));
        else values[field] = input.value;
      });
      var result = opts.onSubmit ? opts.onSubmit(values) : { ok: true };
      if (result && result.ok === false) showErrors(result.errors || []);
    }}, [
      App.dom.el('h3', { text: (isEdit ? 'Editar ' : 'Nuevo ') + fieldLabel(entityName) +
        (record ? ' · ' + record.id : '') }),
      rows,
      errorBox,
      App.dom.el('div', { class: 'btn-row' }, [
        App.dom.el('button', { type: 'submit', class: 'btn btn-primary' }, [isEdit ? 'Guardar cambios' : 'Crear']),
        opts.onCancel ? App.dom.el('button', { type: 'button', class: 'btn', onclick: opts.onCancel }, ['Cancelar']) : null
      ])
    ]);

    return form;
  }

  App.ui.FIELD_LABELS = FIELD_LABELS;
  App.ui.fieldLabel = fieldLabel;
  App.ui.buildForm = buildForm;
})(window);
