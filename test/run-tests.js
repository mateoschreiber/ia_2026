// Pruebas del motor de análisis (requiere Node.js 20+).
// Uso:  node test/run-tests.js
//
// Carga los módulos del análisis, ejecuta el motor sobre data/database.json,
// valida el resultado contra el esquema y reporta detección (precision@k).

const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ROOT = path.resolve(__dirname, '..');
global.window = global;

function load(rel) {
  vm.runInThisContext(fs.readFileSync(path.join(ROOT, rel), 'utf8'), { filename: rel });
}

load('src/core/schema.js');
load('src/core/validator.js');
load('src/analysis/rng.js');
load('src/analysis/features.js');
load('src/analysis/balance.js');
load('src/analysis/anomaly.js');
load('src/analysis/isolationForest.js');
load('src/analysis/autoencoder.js');
load('src/analysis/forecast.js');
load('src/analysis/engine.js');
load('src/analysis/metrics.js');

const App = global.App;
const dataset = JSON.parse(fs.readFileSync(path.join(ROOT, 'data/database.json'), 'utf8'));

const t0 = Date.now();
App.Analysis.engine.apply(dataset, { seed: 42 });
const ms = Date.now() - t0;

const check = App.Validator.validateDataset(dataset);

const labels = {};
dataset.labels.forEach(function (l) { labels[l.meterId] = l.isFraud; });
const fraudTotal = Object.values(labels).filter(Boolean).length;

const det = dataset.detections.slice().sort(function (a, b) { return b.score - a.score; });

console.log('== Pruebas del motor de análisis ==');
console.log('tiempo de cálculo:', ms + 'ms');
console.log('validación del dataset:', check.valid ? 'OK' : 'ERRORES');
if (!check.valid) check.errors.slice(0, 5).forEach(function (e) { console.log('  -', e); });
console.log('detections:', dataset.detections.length, '| forecast:', dataset.forecast.length, '| alerts:', dataset.alerts.length);
console.log('fraudes (ground truth):', fraudTotal);
console.log('');

console.log('Top 10 medidores por score:');
det.slice(0, 10).forEach(function (d, i) {
  console.log('  ' + (i + 1) + '. ' + d.meterId + '  score=' + d.score.toFixed(3) + '  fraude=' + (labels[d.meterId] ? 'SÍ' : 'no'));
});
console.log('');

for (const k of [5, 10, 20]) {
  const tk = det.slice(0, k).map(function (d) { return d.meterId; });
  const hits = tk.filter(function (id) { return labels[id]; }).length;
  console.log('precision@' + k + ': ' + hits + '/' + k + ' = ' + (hits / k).toFixed(2));
}
const recall30 = det.slice(0, 30).filter(function (d) { return labels[d.meterId]; }).length / fraudTotal;
console.log('recall@30: ' + recall30.toFixed(2));
console.log('');

const metrics = App.Analysis.metrics.evaluate(dataset);
console.log('matriz de confusión (flag):', JSON.stringify(metrics.confusion));
console.log('precision:', metrics.precision.toFixed(3), '| recall:', metrics.recall.toFixed(3), '| f1:', metrics.f1.toFixed(3));
console.log('');

if (!check.valid) {
  console.log('PRUEBAS FALLARON.');
  process.exit(1);
}
console.log('TODAS LAS PRUEBAS PASARON.');
