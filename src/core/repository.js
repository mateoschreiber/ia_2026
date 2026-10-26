/* CRUD genérico por entidad, con validación y notificación de cambios. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  function Repository(store, bus) {
    this.store = store;
    this.bus = bus || App.bus;
  }

  Repository.prototype._ensure = function (entity) {
    var ds = this.store.dataset;
    if (!ds) throw new Error('No hay base de datos cargada.');
    if (!Array.isArray(ds[entity])) throw new Error('La entidad "' + entity + '" no existe.');
    return ds[entity];
  };

  Repository.prototype.list = function (entity) {
    return this._ensure(entity).slice();
  };

  Repository.prototype.get = function (entity, id) {
    return this._ensure(entity).filter(function (x) { return x.id === id; })[0] || null;
  };

  Repository.prototype.nextId = function (entity) {
    var def = App.SCHEMA.entities[entity];
    var prefix = (def && def.idPrefix) || 'x';
    var items = this._ensure(entity);
    var ids = {};
    items.forEach(function (x) { if (x.id) ids[x.id] = true; });
    var n = items.length + 1;
    var id = prefix + ('000' + n).slice(-3);
    while (ids[id]) { n += 1; id = prefix + ('000' + n).slice(-3); }
    return id;
  };

  Repository.prototype.create = function (entity, record) {
    var items = this._ensure(entity);
    var draft = Object.assign({}, record || {});
    if (!draft.id) draft.id = this.nextId(entity);
    var check = App.Validator.validateEntity(entity, draft, this.store.dataset);
    if (!check.valid) return { ok: false, errors: check.errors };
    items.push(draft);
    this._changed(entity, 'create', draft);
    return { ok: true, record: draft, errors: [] };
  };

  Repository.prototype.update = function (entity, id, patch) {
    var items = this._ensure(entity);
    var idx = items.findIndex(function (x) { return x.id === id; });
    if (idx === -1) return { ok: false, errors: ['Registro no encontrado.'] };
    var draft = Object.assign({}, items[idx], patch || {}, { id: id });
    var check = App.Validator.validateEntity(entity, draft, this.store.dataset);
    if (!check.valid) return { ok: false, errors: check.errors };
    items[idx] = draft;
    this._changed(entity, 'update', draft);
    return { ok: true, record: draft, errors: [] };
  };

  Repository.prototype.remove = function (entity, id) {
    var items = this._ensure(entity);
    var idx = items.findIndex(function (x) { return x.id === id; });
    if (idx === -1) return { ok: false, errors: ['Registro no encontrado.'] };
    var removed = items.splice(idx, 1)[0];
    this._changed(entity, 'remove', removed);
    return { ok: true, record: removed, errors: [] };
  };

  Repository.prototype._changed = function (entity, action, record) {
    this.store.touch();
    this.bus.emit(App.EVENTS.ENTITY_CHANGED, { entity: entity, action: action, record: record });
  };

  App.Repository = Repository;
})(window);
