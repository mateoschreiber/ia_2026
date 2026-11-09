"""Experimentos reproducibles con particiones independientes y modelos persistibles."""
from collections import defaultdict
from datetime import datetime, timedelta
import time
import numpy as np
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, precision_recall_fscore_support, confusion_matrix
from sklearn.model_selection import train_test_split
from sklearn.pipeline import make_pipeline
from sklearn.preprocessing import StandardScaler, PolynomialFeatures

SEED = 42
ARTIFACT_VERSION = 2
FEATURE_NAMES = ['Media', 'Desviación estándar', 'Percentil 95', 'Proporción de ceros',
                 'Media nocturna', 'Media vespertina', 'Coeficiente de variación']

def features(values):
    a = np.asarray(values, dtype=float)
    if len(a) < 168 or not np.isfinite(a).all() or (a < 0).any():
        raise ValueError('Cada medidor requiere al menos 168 lecturas horarias no negativas y finitas')
    hours = np.arange(len(a)) % 24
    mean = float(a.mean())
    return [mean, float(a.std()), float(np.quantile(a, .95)), float(np.mean(a == 0)),
            float(a[hours < 6].mean()), float(a[(hours >= 18) & (hours < 23)].mean()),
            float(a.std() / (mean + 1e-9))]

def meter_rows(data, include_labels=True):
    readings = {r['meterId']: r for r in data['readings']}
    labels = {l['meterId']: int(l['isFraud']) for l in data.get('labels', [])} if include_labels else {}
    return [(m['id'], features(readings[m['id']]['kwh']), labels.get(m['id']))
            for m in data['meters'] if m['id'] in readings]

def forecast_rows(data):
    tmap = {t['id']: t['zoneId'] for t in data['transformers']}
    mmap = {m['id']: tmap[m['transformerId']] for m in data['meters']}
    temp = np.asarray(data['weather']['tempC'], dtype=float)
    sums = defaultdict(lambda: np.zeros(len(temp)))
    for reading in data['readings']:
        vals = np.asarray(reading['kwh'], dtype=float)
        if len(vals) != len(temp): raise ValueError('Las series deben tener la misma longitud que el clima')
        sums[mmap[reading['meterId']]] += vals
    rows = []
    start = datetime.fromisoformat(data['weather']['start'])
    for zid, hourly in sums.items():
        days = len(temp) // 24
        peak = hourly[:days*24].reshape(-1, 24).max(axis=1)
        temps = temp[:days*24].reshape(-1, 24).max(axis=1)
        for day in range(7, days):
            # Scenario temperature is the observed next-day maximum: an idealized forecast.
            rows.append((day, zid, (start + timedelta(days=day)).date().isoformat(),
                         [temps[day], peak[day-1], peak[day-7]], peak[day]))
    return rows

def _classification(y, score, threshold):
    flags = np.asarray(score) >= threshold
    p, r, f, _ = precision_recall_fscore_support(y, flags, average='binary', zero_division=0)
    k = min(10, len(y)); order = np.argsort(-np.asarray(score))[:k]
    return {'precision':float(p),'recall':float(r),'f1':float(f),
            'confusion':confusion_matrix(y, flags, labels=[0,1]).tolist(),
            'precision_at_k':float(np.mean(np.asarray(y)[order])), 'k':k, 'n':len(y), 'positives':int(sum(y))}

def train(data):
    rows = meter_rows(data)
    if len(rows) < 20 or any(r[2] is None for r in rows): raise ValueError('Se requieren medidores etiquetados para entrenar')
    ids = np.array([r[0] for r in rows]); X = np.array([r[1] for r in rows]); y = np.array([r[2] for r in rows])
    trainidx, rest = train_test_split(np.arange(len(y)), test_size=.4, random_state=SEED, stratify=y)
    validx, testidx = train_test_split(rest, test_size=.5, random_state=SEED, stratify=y[rest])
    # Selection uses validation labels only; test labels are untouched until final evaluation.
    candidates = {'isolation_forest':make_pipeline(StandardScaler(), IsolationForest(n_estimators=150, random_state=SEED)),
                  'distance':make_pipeline(StandardScaler())}
    selected = None
    anomaly_validation = {}
    anomaly_thresholds = {}
    for name, model in candidates.items():
        model.fit(X[trainidx])
        def score(x):
            if name == 'distance': return np.linalg.norm(model.transform(x), axis=1)
            return -model.score_samples(x)
        train_score = score(X[trainidx]); threshold = float(np.quantile(train_score, .9))
        anomaly_thresholds[name] = threshold
        val = _classification(y[validx], score(X[validx]), threshold)
        anomaly_validation[name] = val
        if selected is None or val['f1'] > selected[0]: selected = (val['f1'], name, model, threshold, val)
    _, name, anomaly, threshold, val = selected
    def anomaly_score(x):
        return np.linalg.norm(anomaly.transform(x), axis=1) if name == 'distance' else -anomaly.score_samples(x)
    t = time.perf_counter(); testscore = anomaly_score(X[testidx]); anomaly_ms = (time.perf_counter()-t)*1000
    test = _classification(y[testidx], testscore, threshold)
    fr = forecast_rows(data); days = max(r[0] for r in fr)+1
    tr = [r for r in fr if r[0] < int(days*.6)]
    va = [r for r in fr if int(days*.6) <= r[0] < int(days*.8)]
    te = [r for r in fr if r[0] >= int(days*.8)]
    fx = lambda rr: np.array([r[3] for r in rr]); fy = lambda rr: np.array([r[4] for r in rr])
    models = {'polynomial_ridge':make_pipeline(PolynomialFeatures(degree=2, include_bias=False), StandardScaler(), Ridge()), 'random_forest':RandomForestRegressor(n_estimators=100, min_samples_leaf=3, random_state=SEED, n_jobs=1)}
    val_mae = {}
    for n, m in models.items():
        m.fit(fx(tr), fy(tr)); val_mae[n] = float(mean_absolute_error(fy(va), m.predict(fx(va))))
    fn = min(val_mae, key=val_mae.get); forecast = models[fn]
    t = time.perf_counter(); pred = forecast.predict(fx(te)); forecast_ms=(time.perf_counter()-t)*1000
    baseline = fx(te)[:,1]
    fm = lambda v: {'mae_kw':float(mean_absolute_error(fy(te),v)), 'rmse_kw':float(np.sqrt(mean_squared_error(fy(te),v)))}
    report = {'seed':SEED, 'anomaly':{'selected':name, 'validation':val, 'validation_candidates':anomaly_validation, 'test':test, 'inference_ms_batch':anomaly_ms,
             'split':{'train':ids[trainidx].tolist(),'validation':ids[validx].tolist(),'test':ids[testidx].tolist()},
             'test_predictions':[{'meterId':str(ids[i]),'label':int(y[i]),'score':float(s),'flag':bool(s>=threshold)} for i,s in zip(testidx,testscore)]},
             'forecast':{'selected':fn,'validation_mae_kw':val_mae,'test':fm(pred),'baseline_previous_day':fm(baseline),
             'inference_ms_batch':forecast_ms,'test_predictions':[{'zoneId':r[1],'date':r[2],'actual_kw':float(r[4]),'predicted_kw':float(p),'baseline_kw':float(r[3][1])} for r,p in zip(te,pred)]},
             'limitations':['Datos sintéticos; no demuestra desempeño en campo.', 'Temperatura futura observada usada como escenario idealizado.', 'Pocos casos positivos; métricas inestables.', 'Entrenamiento y prueba de pronóstico comparten zonas.']}
    return {'version':ARTIFACT_VERSION, 'anomaly_model':anomaly,'anomaly_name':name,'threshold':threshold,
            'anomaly_candidates':candidates, 'anomaly_thresholds':anomaly_thresholds,
            'forecast_model':forecast, 'forecast_candidates':models, 'forecast_name':fn, 'report':report}

def analyze(data, bundle, temperature, power_factor=.9):
    rows=meter_rows(data, include_labels=False); X=np.array([r[1] for r in rows]); model=bundle['anomaly_model']
    scores = np.linalg.norm(model.transform(X),axis=1) if bundle['anomaly_name']=='distance' else -model.score_samples(X)
    detections=[{'meterId':r[0],'score':float(s),'flag':bool(s>=bundle['threshold'])} for r,s in zip(rows,scores)]
    detections.sort(key=lambda r:r['score'], reverse=True)
    fr=forecast_rows(data); zones={z['id']:z['name'] for z in data['zones']}; forecasts=[]
    for zid in zones:
        rr=[r for r in fr if r[1]==zid]
        if not rr: continue
        last=rr[-1]; Xf=[[temperature,last[4],rr[-7][4]]]
        forecasts.append({'zoneId':zid,'zone':zones[zid], 'date':(datetime.fromisoformat(last[2])+timedelta(days=1)).date().isoformat(), 'peak_kw':max(0.,float(bundle['forecast_model'].predict(Xf)[0])), 'scenario_temp_c':temperature})
    return {'detections':detections,'forecast':forecasts,'threshold':bundle['threshold'],'power_factor':power_factor}
