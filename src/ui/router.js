/* Router por hash (#/ruta). Renderiza la vista en un contenedor. */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  function Router(container, bus) {
    this.container = container;
    this.bus = bus || App.bus;
    this.routes = {};
    this.current = null;
  }

  Router.prototype.add = function (path, handler) {
    this.routes[path] = handler;
    return this;
  };

  Router.prototype.start = function () {
    var self = this;
    global.addEventListener('hashchange', function () { self._resolve(); });
    this._resolve();
  };

  Router.prototype.go = function (path) {
    var target = '#' + path;
    if (global.location.hash === target) { this._resolve(); }
    else { global.location.hash = path; }
  };

  Router.prototype.refresh = function () {
    this._resolve();
  };

  Router.prototype._path = function () {
    var h = global.location.hash.replace(/^#/, '');
    return h || '/inicio';
  };

  Router.prototype._resolve = function () {
    var path = this._path();
    var handler = this.routes[path] || this.routes['*'];
    if (!handler) return;
    App.dom.clear(this.container);
    var node = null;
    try {
      node = handler({ path: path });
    } catch (err) {
      console.error('[router] error en vista', path, err);
      node = App.dom.el('pre', { class: 'error-block' }, [String((err && err.stack) || err)]);
    }
    if (node) this.container.appendChild(node);
    this.current = path;
    this.bus.emit(App.EVENTS.ROUTE_CHANGED, { path: path });
  };

  App.Router = Router;
})(window);
