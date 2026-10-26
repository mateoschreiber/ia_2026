/* Estado central de la aplicación + caché persistente.

   La caché usa IndexedDB (admite datasets grandes, p. ej. 100 medidores x
   8760 h ~ 12 MB), con respaldo a localStorage solo para datasets pequeños.
   La fuente canónica sigue siendo `data/database.json`. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  var DB_NAME = 'proyectoIA';
  var DB_STORE = 'kv';
  var DB_VERSION = 1;
  var IDB_KEY = 'dataset';
  var LS_KEY = 'proyectoIA.dataset.v1'; // legado de la F0
  var LS_MAX = 4 * 1024 * 1024; // no intentar localStorage por encima de ~4 MB

  function debounce(fn, wait) {
    var timer = null;
    return function () {
      var args = arguments;
      var self = this;
      clearTimeout(timer);
      timer = setTimeout(function () { fn.apply(self, args); }, wait);
    };
  }

  function idbOpen() {
    return new Promise(function (resolve, reject) {
      if (!global.indexedDB) { reject(new Error('indexedDB no disponible')); return; }
      var req = global.indexedDB.open(DB_NAME, DB_VERSION);
      req.onupgradeneeded = function () {
        var db = req.result;
        if (!db.objectStoreNames.contains(DB_STORE)) db.createObjectStore(DB_STORE);
      };
      req.onsuccess = function () { resolve(req.result); };
      req.onerror = function () { reject(req.error); };
      req.onblocked = function () { reject(new Error('indexedDB bloqueada')); };
    });
  }

  function idbGet(key) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, 'readonly');
        var rq = tx.objectStore(DB_STORE).get(key);
        rq.onsuccess = function () { db.close(); resolve(rq.result); };
        rq.onerror = function () { db.close(); reject(rq.error); };
      });
    });
  }

  function idbPut(key, value) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).put(value, key);
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
        tx.onabort = function () { db.close(); reject(tx.error); };
      });
    });
  }

  function idbDelete(key) {
    return idbOpen().then(function (db) {
      return new Promise(function (resolve, reject) {
        var tx = db.transaction(DB_STORE, 'readwrite');
        tx.objectStore(DB_STORE).delete(key);
        tx.oncomplete = function () { db.close(); resolve(); };
        tx.onerror = function () { db.close(); reject(tx.error); };
      });
    });
  }

  function Store(bus) {
    this.bus = bus || App.bus;
    this._dataset = null;
    this._fileName = null;
    this._persist = debounce(this._writeCache.bind(this), 250);
  }

  Store.prototype.isLoaded = function () { return this._dataset !== null; };

  Object.defineProperty(Store.prototype, 'dataset', {
    get: function () { return this._dataset; }
  });

  Object.defineProperty(Store.prototype, 'fileName', {
    get: function () { return this._fileName; }
  });

  // Devuelve una Promise<boolean>.
  Store.prototype.loadFromCache = function () {
    var self = this;
    return idbGet(IDB_KEY).then(function (raw) {
      if (raw) {
        var parsed = JSON.parse(raw);
        var check = App.Validator.validateDataset(parsed);
        if (check.valid) {
          self._dataset = parsed;
          self.bus.emit(App.EVENTS.DATASET_LOADED, { source: 'cache', warnings: check.warnings });
          return true;
        }
      }
      try {
        var ls = global.localStorage.getItem(LS_KEY);
        if (ls) {
          var p2 = JSON.parse(ls);
          var c2 = App.Validator.validateDataset(p2);
          if (c2.valid) {
            self._dataset = p2;
            self.bus.emit(App.EVENTS.DATASET_LOADED, { source: 'cache', warnings: c2.warnings });
            return true;
          }
        }
      } catch (_) {}
      return false;
    }).catch(function (err) {
      console.warn('[store] caché no disponible:', err);
      return false;
    });
  };

  Store.prototype.setDataset = function (ds, opts) {
    opts = opts || {};
    var check = App.Validator.validateDataset(ds);
    if (!check.valid) {
      return { ok: false, errors: check.errors, warnings: check.warnings };
    }
    this._dataset = ds;
    if (opts.fileName) this._fileName = opts.fileName;
    if (opts.persist !== false) this._persist();
    this.bus.emit(App.EVENTS.DATASET_LOADED, { source: opts.source || 'file', warnings: check.warnings });
    return { ok: true, errors: [], warnings: check.warnings };
  };

  Store.prototype.touch = function () {
    if (!this._dataset) return;
    this._persist();
    this.bus.emit(App.EVENTS.DATASET_CHANGED, this._dataset);
  };

  Store.prototype.reset = function () {
    this._dataset = null;
    this._fileName = null;
    try { global.localStorage.removeItem(LS_KEY); } catch (_) {}
    idbDelete(IDB_KEY).catch(function () {});
    this.bus.emit(App.EVENTS.DATASET_LOADED, { source: 'reset' });
  };

  Store.prototype.summary = function () {
    var ds = this._dataset;
    if (!ds) return null;
    return {
      zones: (ds.zones || []).length,
      transformers: (ds.transformers || []).length,
      meters: (ds.meters || []).length,
      readings: (ds.readings || []).length,
      alerts: (ds.alerts || []).length,
      detections: (ds.detections || []).length
    };
  };

  Store.prototype._writeCache = function () {
    if (!this._dataset) return;
    var json;
    try { json = JSON.stringify(this._dataset); }
    catch (err) { console.warn('[store] no se pudo serializar:', err); return; }

    idbPut(IDB_KEY, json).catch(function () {
      if (json.length < LS_MAX) {
        try { global.localStorage.setItem(LS_KEY, json); } catch (_) {}
      }
    });
  };

  App.Store = Store;
  App.STORE_CACHE_KEY = LS_KEY;
})(window);
