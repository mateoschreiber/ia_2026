/* Arranque de la aplicación: instancia el store, el CRUD, el router y las vistas. */
(function (global) {
  'use strict';
  var App = global.App;
  var bus = App.bus;

  var store = new App.Store(bus);
  App.store = store;

  var repo = new App.Repository(store, bus);
  App.repo = repo;

  var fileStore = new App.FileStore(store, bus);
  App.fileStore = fileStore;

  var container = document.getElementById('app-view');
  var router = new App.Router(container, bus);
  App.router = router;

  router
    .add('/inicio', function () { return App.views.home(); })
    .add('/dashboard', function () { return App.views.dashboard(); })
    .add('/crud', function () { return App.views.crud(); })
    .add('/metricas', function () { return App.views.metrics(); })
    .add('*', function () { return App.views.home(); });

  function renderNav() {
    var nav = document.getElementById('app-nav');
    App.dom.clear(nav);
    [
      { path: '/inicio', label: App.i18n.t('navHome') },
      { path: '/dashboard', label: App.i18n.t('navDashboard') },
      { path: '/crud', label: App.i18n.t('navCrud') },
      { path: '/metricas', label: App.i18n.t('navMetrics') }
    ].forEach(function (item) {
      nav.appendChild(App.dom.el('a', {
        class: 'nav-link',
        href: '#' + item.path,
        'data-path': item.path,
        text: item.label
      }));
    });
  }

  function updateNavActive(path) {
    var links = document.querySelectorAll('.nav-link');
    Array.prototype.forEach.call(links, function (a) {
      a.classList.toggle('is-active', a.getAttribute('data-path') === path);
    });
  }

  function updateStatus() {
    var el = document.getElementById('app-status');
    var s = store.summary();
    if (!s) {
      el.textContent = App.i18n.t('statusEmpty');
      el.className = 'app-status is-empty';
      return;
    }
    el.textContent = s.meters + ' medidores · ' + s.readings + ' series · ' + s.alerts + ' alertas';
    el.className = 'app-status is-ready';
  }

  function toast(notice) {
    var host = document.getElementById('toast-host');
    if (!host) return;
    var node = App.dom.el('div', { class: 'toast toast-' + (notice.kind || 'info') }, [notice.message]);
    host.appendChild(node);
    setTimeout(function () {
      node.classList.add('is-out');
      setTimeout(function () { node.remove(); }, 300);
    }, 4200);
  }

  bus.on(App.EVENTS.ROUTE_CHANGED, function (e) { updateNavActive(e.path); });
  bus.on(App.EVENTS.DATASET_LOADED, function () { updateStatus(); if (router.current) router.refresh(); });
  bus.on(App.EVENTS.DATASET_CHANGED, function () { updateStatus(); });
  bus.on(App.EVENTS.NOTICE, toast);

  // El arranque es asíncrono: primero se intenta restaurar la caché (IndexedDB).
  store.loadFromCache().then(function () {
    renderNav();
    updateStatus();

    if (!global.location.hash) {
      global.location.hash = store.isLoaded() ? '#/dashboard' : '#/inicio';
    }
    router.start();
  });

  global.ProyectoIA = { App: App, store: store, repo: repo, fileStore: fileStore, router: router };
})(window);
