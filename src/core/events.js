/* Bus de eventos. Namespace global App; scripts clásicos (sin ES Modules)
   para poder abrir la app con doble clic (file://). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  var EVENTS = {
    DATASET_LOADED: 'dataset:loaded',
    DATASET_CHANGED: 'dataset:changed',
    ENTITY_CHANGED: 'entity:changed',
    FILE_STATE: 'file:state',
    ROUTE_CHANGED: 'route:changed',
    NOTICE: 'app:notice'
  };

  function EventBus() {
    this._handlers = {};
  }

  EventBus.prototype.on = function (event, handler) {
    if (!this._handlers[event]) this._handlers[event] = [];
    this._handlers[event].push(handler);
    var self = this;
    return function () { self.off(event, handler); };
  };

  EventBus.prototype.off = function (event, handler) {
    var list = this._handlers[event];
    if (!list) return;
    this._handlers[event] = list.filter(function (h) { return h !== handler; });
  };

  EventBus.prototype.emit = function (event, payload) {
    var list = this._handlers[event];
    if (!list) return;
    list.slice().forEach(function (handler) {
      try { handler(payload); }
      catch (err) { console.error('[bus] error en', event, err); }
    });
  };

  App.EVENTS = EVENTS;
  App.EventBus = EventBus;
  App.bus = new EventBus();
})(window);
