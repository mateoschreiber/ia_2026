/* Apertura/guardado de la base de datos (un único .json).
   - File System Access API en Chrome/Edge (leer/escribir el archivo en disco).
   - Fallback universal: selector de archivo para abrir y descarga (Blob) para guardar.
   - Arrastrar y soltar el .json también funciona. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  var DB_FILENAME = 'database.json';

  function supportsFsAccess() {
    return typeof global.showOpenFilePicker === 'function' &&
           typeof global.showSaveFilePicker === 'function';
  }

  function FileStore(store, bus) {
    this.store = store;
    this.bus = bus || App.bus;
    this._handle = null;
    this._input = null;
    this._bindDragDrop();
  }

  FileStore.prototype.open = function () {
    if (supportsFsAccess()) {
      return global.showOpenFilePicker({
        types: [{ description: 'Base de datos JSON', accept: { 'application/json': ['.json'] } }],
        multiple: false
      }).then(function (handles) {
        var handle = handles[0];
        this._handle = handle;
        return handle.getFile().then(function (file) {
          return this._loadFile(file, { handle: handle });
        }.bind(this));
      }.bind(this)).catch(function (err) {
        if (err && err.name === 'AbortError') return null;
        console.warn('[file] FSA open falló, uso selector:', err);
        return this._openWithInput();
      }.bind(this));
    }
    return this._openWithInput();
  };

  FileStore.prototype._openWithInput = function () {
    var self = this;
    return new Promise(function (resolve) {
      if (!self._input) {
        var input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json,application/json';
        input.style.display = 'none';
        input.addEventListener('change', function () { self._onInputChange(input, resolve); });
        document.body.appendChild(input);
        self._input = input;
      }
      self._input.value = '';
      self._input.click();
    });
  };

  FileStore.prototype._onInputChange = function (input, resolve) {
    var file = input.files && input.files[0];
    if (!file) { resolve(null); return; }
    this._handle = null;
    this._loadFile(file, { handle: null }).then(resolve);
  };

  FileStore.prototype._loadFile = function (file, opts) {
    var self = this;
    return file.text().then(function (text) {
      var data;
      try {
        data = JSON.parse(text);
      } catch (err) {
        self._notify('error', 'El archivo no es JSON válido: ' + err.message);
        return null;
      }
      var result = self.store.setDataset(data, { source: 'file', fileName: file.name, persist: true });
      if (!result.ok) {
        self._notify('error', 'La base de datos no pasó la validación: ' + result.errors[0]);
        return null;
      }
      if (opts.handle) self._handle = opts.handle;
      self.bus.emit(App.EVENTS.FILE_STATE, { fileName: file.name, canSave: !!self._handle });
      self._notify('ok', 'Base de datos cargada: ' + file.name +
        (result.warnings.length ? ' (' + result.warnings.length + ' advertencias).' : '.'));
      return data;
    }).catch(function (err) {
      self._notify('error', 'No se pudo leer el archivo: ' + err.message);
      return null;
    });
  };

  FileStore.prototype.save = function () {
    if (!this.store.isLoaded()) return Promise.resolve(false);
    var data = this.store.dataset;

    if (supportsFsAccess()) {
      var self = this;
      var handlePromise = this._handle
        ? Promise.resolve(this._handle)
        : global.showSaveFilePicker({
            suggestedName: this.store.fileName || DB_FILENAME,
            types: [{ description: 'Base de datos JSON', accept: { 'application/json': ['.json'] } }]
          });

      return handlePromise.then(function (handle) {
        return handle.createWritable().then(function (writable) {
          return writable.write(JSON.stringify(data, null, 2)).then(function () {
            return writable.close();
          });
        }).then(function () {
          self._handle = handle;
          self.bus.emit(App.EVENTS.FILE_STATE, { fileName: handle.name, canSave: true });
          self._notify('ok', 'Guardado en ' + handle.name + '.');
          return true;
        });
      }).catch(function (err) {
        if (err && err.name === 'AbortError') return false;
        console.warn('[file] FSA save falló, descargo copia:', err);
        return Promise.resolve(self.download());
      });
    }
    return Promise.resolve(this.download());
  };

  FileStore.prototype.download = function (filename) {
    if (!this.store.isLoaded()) return false;
    var name = filename || this.store.fileName || DB_FILENAME;
    var blob = new Blob([JSON.stringify(this.store.dataset, null, 2)], { type: 'application/json' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
    this._notify('ok', 'Copia descargada: ' + name + '.');
    return true;
  };

  FileStore.prototype._bindDragDrop = function () {
    var self = this;
    global.addEventListener('dragover', function (ev) { ev.preventDefault(); });
    global.addEventListener('drop', function (ev) {
      ev.preventDefault();
      var file = ev.dataTransfer && ev.dataTransfer.files && ev.dataTransfer.files[0];
      if (file) self._loadFile(file, { handle: null });
    });
  };

  FileStore.prototype._notify = function (kind, message) {
    this.bus.emit(App.EVENTS.NOTICE, { kind: kind, message: message, at: Date.now() });
  };

  App.FileStore = FileStore;
  App.DB_FILENAME = DB_FILENAME;
})(window);
