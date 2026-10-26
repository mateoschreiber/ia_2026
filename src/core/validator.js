/* Validación del dataset y de registros individuales. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  function isValidType(value, type) {
    if (type === 'array') return Array.isArray(value);
    if (type === 'object') return value !== null && typeof value === 'object' && !Array.isArray(value);
    if (type === 'number') return typeof value === 'number' && isFinite(value);
    return typeof value === type;
  }

  function validateDataset(ds) {
    var errors = [];
    var warnings = [];
    if (!ds || typeof ds !== 'object' || Array.isArray(ds)) {
      return { valid: false, errors: ['El dataset no es un objeto válido.'], warnings: warnings };
    }

    var schema = App.SCHEMA;
    Object.keys(schema.topLevel).forEach(function (key) {
      var rule = schema.topLevel[key];
      if (rule.required && !(key in ds)) {
        errors.push('Falta la sección "' + key + '".');
      } else if ((key in ds) && !isValidType(ds[key], rule.type)) {
        errors.push('"' + key + '" debe ser de tipo ' + rule.type + '.');
      }
    });
    if (errors.length) return { valid: false, errors: errors, warnings: warnings };

    Object.keys(schema.entities).forEach(function (name) {
      var def = schema.entities[name];
      var items = ds[name] || [];
      var seen = {};
      items.forEach(function (item, i) {
        if (!item || typeof item !== 'object') {
          errors.push(name + '[' + i + '] no es un objeto.');
          return;
        }
        if (!item.id) {
          errors.push(name + '[' + i + '] no tiene id.');
        } else if (seen[item.id]) {
          errors.push(name + '[' + i + '] id duplicado: ' + item.id + '.');
        } else {
          seen[item.id] = true;
        }
      });

      Object.keys(def.fields).forEach(function (field) {
        var rule = def.fields[field];
        if (!rule.ref) return;
        var targetIds = {};
        (ds[rule.ref] || []).forEach(function (x) { if (x && x.id) targetIds[x.id] = true; });
        items.forEach(function (item, i) {
          if (item && item[field] != null && item[field] !== '' && !targetIds[item[field]]) {
            warnings.push(name + '[' + i + '].' + field + ' apunta a un ' + rule.ref + ' inexistente: ' + item[field] + '.');
          }
        });
      });
    });

    return { valid: errors.length === 0, errors: errors, warnings: warnings };
  }

  function validateEntity(entityName, record, dataset) {
    var schema = App.SCHEMA;
    var def = schema.entities[entityName];
    if (!def) return { valid: false, errors: ['Entidad desconocida: ' + entityName] };
    var errors = [];

    Object.keys(def.fields).forEach(function (field) {
      var rule = def.fields[field];
      var value = record ? record[field] : undefined;

      if (rule.required && (value === undefined || value === null || value === '')) {
        errors.push('El campo "' + field + '" es obligatorio.');
        return;
      }
      if (value === undefined || value === null) return;

      if (rule.type === 'number' && !isValidType(value, 'number')) errors.push('"' + field + '" debe ser numérico.');
      if (rule.type === 'string' && typeof value !== 'string') errors.push('"' + field + '" debe ser texto.');
      if (rule.type === 'boolean' && typeof value !== 'boolean') errors.push('"' + field + '" debe ser booleano.');
      if (rule.min !== undefined && typeof value === 'number' && value < rule.min) errors.push('"' + field + '" debe ser >= ' + rule.min + '.');
      if (rule.enum && rule.enum.indexOf(value) === -1) errors.push('"' + field + '" debe ser uno de: ' + rule.enum.join(', ') + '.');
      if (rule.ref && dataset) {
        var ids = {};
        (dataset[rule.ref] || []).forEach(function (x) { if (x && x.id) ids[x.id] = true; });
        if (!ids[value]) errors.push('"' + field + '" referencia inexistente en ' + rule.ref + '.');
      }
    });

    return { valid: errors.length === 0, errors: errors };
  }

  App.Validator = {
    isValidType: isValidType,
    validateDataset: validateDataset,
    validateEntity: validateEntity
  };
})(window);
