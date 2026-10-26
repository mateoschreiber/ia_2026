/* Cadenas de texto de la interfaz (español). */
(function (global) {
  'use strict';
  var App = (global.App = global.App || {});

  var strings = {
    appName: 'Supervisión Energética',
    navHome: 'Inicio',
    navDashboard: 'Dashboard',
    navCrud: 'Datos (CRUD)',
    navMetrics: 'Métricas',
    statusEmpty: 'Sin base de datos',
    openDb: 'Abrir base de datos',
    saveDb: 'Guardar',
    downloadDb: 'Descargar copia',
    resetDb: 'Restablecer (borrar caché)',
    goDashboard: 'Ir al dashboard',
    loadTitle: 'Cargar la base de datos',
    loadHint: 'Para empezar, abre el archivo de datos:',
    loadOr: 'o arrástralo y suéltalo en cualquier parte de la ventana.',
    loadedTitle: 'Base de datos cargada',
    datasetSummary: 'Resumen del dataset',
    zones: 'Zonas',
    transformers: 'Transformadores',
    meters: 'Medidores',
    readings: 'Series de lecturas',
    alerts: 'Alertas',
    detections: 'Detecciones',
    fileName: 'Archivo',
    cache: 'caché local',
    dashboardPlaceholder: 'El dashboard completo se implementa en la Fase 4.',
    crudPlaceholder: 'El CRUD completo por entidad se implementa en la Fase 2.',
    metricsPlaceholder: 'Las métricas del modelo se implementan en la Fase 5.',
    chartUnavailable: 'Chart.js no está disponible (revisa assets/vendor/chart.umd.js).'
  };

  App.i18n = {
    strings: strings,
    t: function (key) { return strings[key] !== undefined ? strings[key] : key; }
  };
})(window);
