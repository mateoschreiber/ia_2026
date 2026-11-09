"""Servicio local de demostración. El volumen runtime solo debe contener datos confiables."""
import json
import hashlib
import math
import os
import shutil
from contextlib import asynccontextmanager
from pathlib import Path
from threading import RLock

import joblib
import numpy as np
from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import FileResponse, JSONResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel, Field
from starlette.middleware.trustedhost import TrustedHostMiddleware
from backend.ml import ARTIFACT_VERSION, train, analyze
from backend.visual import revision, dataset_series, meter_explanation, forecast_explanation, simulate

ROOT = Path(__file__).resolve().parent.parent
RUNTIME = Path(os.environ.get('ENERGIA_RUNTIME', ROOT / 'runtime'))
SOURCE = ROOT / 'data' / 'database.json'
LOCK = RLock()
MAX_BYTES = 30 * 1024 * 1024
state = {'results': None}

def read_json(path):
    return json.loads(path.read_text(encoding='utf-8'))

def write_json(path, value):
    tmp = path.with_suffix('.tmp')
    tmp.write_text(json.dumps(value, ensure_ascii=False, allow_nan=False), encoding='utf-8')
    os.replace(tmp, path)

def validate(data):
    if not isinstance(data, dict): raise ValueError('Se esperaba un objeto JSON')
    for key in ('zones', 'transformers', 'meters', 'readings'):
        if not isinstance(data.get(key), list) or not data[key]: raise ValueError(f'{key} debe ser una lista no vacía')
        if len(data[key]) > 1000: raise ValueError(f'{key} excede el máximo de 1000 registros')
    weather = data.get('weather', {})
    if not isinstance(weather, dict) or weather.get('intervalH') != 1: raise ValueError('El clima requiere intervalo horario')
    temps = weather.get('tempC')
    if not isinstance(temps, list) or not 336 <= len(temps) <= 8784 or len(temps) % 24: raise ValueError('El clima requiere entre 14 y 366 días completos')
    def valid_num(n): return isinstance(n, (int,float)) and not isinstance(n,bool) and math.isfinite(n)
    if not all(valid_num(n) and -30 <= n <= 60 for n in temps): raise ValueError('Temperaturas inválidas')
    from datetime import datetime
    try:
        start = datetime.fromisoformat(weather['start'])
        if start.hour or start.minute or start.second or start.microsecond: raise ValueError('El inicio debe ser a medianoche')
    except (ValueError, KeyError, TypeError): raise ValueError('Fecha inicial de clima inválida')
    def ids(key):
        a=[v.get('id') for v in data[key] if isinstance(v,dict)]
        if len(a)!=len(data[key]) or any(not isinstance(i,str) or not i or len(i)>80 for i in a) or len(set(a))!=len(a): raise ValueError(f'IDs inválidos o duplicados en {key}')
        return set(a)
    zones, trafos, meters = ids('zones'), ids('transformers'), ids('meters')
    for t in data['transformers']:
        if t.get('zoneId') not in zones or not valid_num(t.get('capacityKva')) or t['capacityKva'] <= 0: raise ValueError('Transformador inválido')
        supplied=t.get('energySuppliedKwh')
        if supplied is not None and (not valid_num(supplied) or supplied < 0): raise ValueError('Energía suministrada inválida')
    for m in data['meters']:
        if m.get('transformerId') not in trafos: raise ValueError('Medidor con transformador inexistente')
        if m.get('customerType') not in ('residencial', 'comercial', 'industrial'):
            raise ValueError('Tipo de cliente inválido')
        contracted = m.get('capacityContractedKw')
        if contracted is not None and (not valid_num(contracted) or contracted < 0):
            raise ValueError('Potencia contratada inválida')
    seen=set()
    for r in data['readings']:
        if not isinstance(r,dict) or r.get('meterId') not in meters or r['meterId'] in seen: raise ValueError('Lectura con medidor inexistente o repetido')
        if r.get('intervalH') != 1 or r.get('start') != weather['start']: raise ValueError('Lecturas y clima deben tener inicio e intervalo horario iguales')
        vals=r.get('kwh')
        if not isinstance(vals,list) or len(vals)!=len(temps) or not all(valid_num(x) and x>=0 for x in vals): raise ValueError('Lecturas de energía inválidas')
        seen.add(r['meterId'])
    if seen != meters: raise ValueError('Debe existir una serie por medidor')
    for z in data['zones']:
        if not isinstance(z.get('name'),str) or len(z['name'])>100: raise ValueError('Nombre de zona inválido')
    return data

@asynccontextmanager
async def lifespan(app):
    RUNTIME.mkdir(parents=True, exist_ok=True)
    if not (RUNTIME/'database.json').exists(): write_json(RUNTIME/'database.json', validate(read_json(SOURCE)))
    # The model is trained only on the original educational dataset, never on an import.
    model_path = RUNTIME/'model.joblib'
    old = joblib.load(model_path) if model_path.exists() else None
    if old is None or old.get('version') != ARTIFACT_VERSION:
        if old is not None:
            backup = RUNTIME/'model.v1.backup.joblib'
            if not backup.exists():
                shutil.copy2(model_path, backup)
        bundle = train(validate(read_json(SOURCE)))
        if old is not None:
            # Migration must not silently alter the published held-out evaluation.
            for name in ('anomaly', 'forecast'):
                if bundle['report'][name]['selected'] != old['report'][name]['selected'] or bundle['report'][name]['test'] != old['report'][name]['test']:
                    raise RuntimeError('La migración cambió los resultados publicados; se conservó el respaldo')
            bundle['report'] = old['report']
        temporary = RUNTIME/'model.new.joblib'
        joblib.dump(bundle, temporary)
        os.replace(temporary, model_path)
        write_json(RUNTIME/'metrics.json', bundle['report'])
    state['bundle']=joblib.load(model_path)
    state['model_revision']=hashlib.sha256(model_path.read_bytes()).hexdigest()
    yield

app=FastAPI(title='Supervisión energética', version='1.0', lifespan=lifespan)
app.add_middleware(TrustedHostMiddleware, allowed_hosts=['localhost','127.0.0.1','testserver'])
WEB = ROOT/'web'/'dist' if (ROOT/'web'/'dist'/'index.html').exists() else ROOT/'web'
app.mount('/static', StaticFiles(directory=WEB), name='static')

@app.middleware('http')
async def headers(request, call_next):
    length=request.headers.get('content-length')
    if length and (not length.isdigit() or int(length)>MAX_BYTES): return JSONResponse({'detail':'Archivo demasiado grande'},status_code=413)
    if request.method not in ('GET','HEAD','OPTIONS'):
        origin=request.headers.get('origin')
        if origin and origin not in ('http://localhost:8000','http://127.0.0.1:8000','http://testserver'): return JSONResponse({'detail':'Origen no permitido'},status_code=403)
    response=await call_next(request)
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['X-Frame-Options']='DENY'
    response.headers['Content-Security-Policy']="default-src 'self'; style-src 'self'; script-src 'self'; object-src 'none'; base-uri 'none'"
    return response

@app.get('/')
def home(): return FileResponse(WEB/'index.html')

@app.get('/api/health')
def health(): return {'status':'ok','synthetic':True,'model':state['bundle']['anomaly_name']}

@app.get('/api/data')
def get_data():
    with LOCK: return read_json(RUNTIME/'database.json')

@app.put('/api/data')
async def put_data(request: Request):
    body=await request.body()
    if len(body)>MAX_BYTES: raise HTTPException(413,'Archivo demasiado grande')
    try: data=validate(json.loads(body))
    except (ValueError, TypeError, KeyError) as e: raise HTTPException(422,str(e)) from e
    with LOCK:
        write_json(RUNTIME/'database.json', data)
        state['results']=None
    return {'status':'guardado','analysis_invalidated':True}

@app.post('/api/reset')
def reset():
    with LOCK:
        write_json(RUNTIME/'database.json',validate(read_json(SOURCE))); state['results']=None
    return {'status':'restaurado'}

class Scenario(BaseModel):
    temperature: float = Field(ge=-30, le=60, allow_inf_nan=False)
    power_factor: float = Field(default=.9, gt=0, le=1, allow_inf_nan=False)

@app.post('/api/analyze')
def run_analysis(scenario: Scenario):
    with LOCK:
        data=read_json(RUNTIME/'database.json')
        result=analyze(data,state['bundle'],scenario.temperature,scenario.power_factor)
        readings={r['meterId']:np.array(r['kwh']) for r in data['readings']}
        alerts=[]
        for t in data['transformers']:
            series=[readings[m['id']] for m in data['meters'] if m['transformerId']==t['id']]
            if not series: continue
            load=np.sum(series,axis=0); peak=float(np.max(load)); capacity=t['capacityKva']*scenario.power_factor
            if peak>=capacity*.75: alerts.append({'type':'carga','id':t['id'],'message':f'Pico {peak:.2f} kW / capacidad asumida {capacity:.2f} kW'})
            supplied=t.get('energySuppliedKwh')
            if supplied is None or supplied<=0: alerts.append({'type':'balance','id':t['id'],'message':'Balance no disponible: falta energía suministrada positiva.'})
            else:
                loss=(supplied-float(load.sum()))/supplied*100
                if loss>12: alerts.append({'type':'balance','id':t['id'],'message':f'Diferencia de energía: {loss:.1f} %'})
        for d in result['detections']:
            if d['flag']: alerts.append({'type':'anomalia','id':d['meterId'],'message':f'Puntuación anómala {d["score"]:.3f}; requiere inspección.'})
        result['alerts']=alerts
        result['dataset_revision']=revision(data); result['model_revision']=state['model_revision']
        state['results']=result
    return result

@app.get('/api/results')
def results(): return state['results'] or {'status':'sin análisis'}

@app.get('/api/metrics')
def metrics(): return state['bundle']['report']

@app.get('/api/insight')
def insight(meter_id: str, zone_id: str, temperature: float = 35, tree: int = 0):
    if not math.isfinite(temperature) or not -30 <= temperature <= 60:
        raise HTTPException(422, 'Temperatura inválida')
    with LOCK:
        data=read_json(RUNTIME/'database.json')
        try:
            return {'dataset_revision':revision(data), 'model_revision':state['model_revision'],
                    'series':dataset_series(data,meter_id,zone_id),
                    'meter':meter_explanation(data,state['bundle'],meter_id,tree),
                    'forecast':forecast_explanation(data,state['bundle'],zone_id,temperature)}
        except (ValueError, IndexError) as exc:
            raise HTTPException(422,str(exc)) from exc

class Laboratory(Scenario):
    meter_id: str = Field(min_length=1, max_length=80)
    zone_id: str = Field(min_length=1, max_length=80)
    base_temperature: float = Field(default=35, ge=-30, le=60, allow_inf_nan=False)
    operation: str = Field(default='none', pattern='^(none|uniform|night|outage)$')
    amount: float = Field(default=50, ge=0, le=100, allow_inf_nan=False)
    start_hour: int = Field(default=0, ge=0, le=8783)
    duration: int = Field(default=24, ge=1, le=8784)
    dataset_revision: str = Field(min_length=64, max_length=64)

@app.post('/api/simulate')
def laboratory(scenario: Laboratory):
    with LOCK:
        data=read_json(RUNTIME/'database.json')
        current=revision(data)
        if current != scenario.dataset_revision:
            raise HTTPException(409, 'Los datos cambiaron; actualizá la vista')
        try:
            result=simulate(data,state['bundle'],scenario.meter_id,scenario.zone_id,
                            scenario.base_temperature,scenario.temperature,scenario.power_factor,
                            scenario.operation,scenario.amount,scenario.start_hour,scenario.duration)
        except ValueError as exc:
            raise HTTPException(422,str(exc)) from exc
        result['dataset_revision']=current; result['model_revision']=state['model_revision']
        return result
