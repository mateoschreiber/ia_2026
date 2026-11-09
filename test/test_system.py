import json
import os
from pathlib import Path

import numpy as np
import pytest
from fastapi.testclient import TestClient

ROOT=Path(__file__).resolve().parents[1]

@pytest.fixture(scope='module')
def client(tmp_path_factory):
    os.environ['ENERGIA_RUNTIME']=str(tmp_path_factory.mktemp('energy'))
    from backend.api import app
    with TestClient(app) as c: yield c

def test_health_and_held_out_metrics(client):
    assert client.get('/api/health').json()['status']=='ok'
    report=client.get('/api/metrics').json()
    split=report['anomaly']['split']
    assert not (set(split['train']) & set(split['test']))
    assert not (set(split['validation']) & set(split['test']))
    pred=report['anomaly']['test_predictions']
    assert len(pred)==report['anomaly']['test']['n']
    assert sum(p['label'] for p in pred)==report['anomaly']['test']['positives']
    assert report['forecast']['test']['mae_kw'] >= 0
    predictions=report['forecast']['test_predictions']
    recomputed=np.mean([abs(p['actual_kw']-p['predicted_kw']) for p in predictions])
    assert recomputed == pytest.approx(report['forecast']['test']['mae_kw'])

def test_scenario_validation_and_invalidation(client):
    assert client.post('/api/analyze',json={'temperature':100}).status_code==422
    result=client.post('/api/analyze',json={'temperature':35,'power_factor':.9})
    assert result.status_code==200
    body=result.json()
    assert len(body['forecast'])==5 and all(x['scenario_temp_c']==35 for x in body['forecast'])
    assert all(np.isfinite(x['peak_kw']) for x in body['forecast'])
    data=client.get('/api/data').json()
    data['zones'][0]['name']='Zona editada'
    assert client.put('/api/data',json=data).status_code==200
    assert client.get('/api/results').json()['status']=='sin análisis'
    assert client.get('/api/data').json()['zones'][0]['name']=='Zona editada'
    assert client.post('/api/reset').status_code==200

def test_invalid_dataset_and_origin(client):
    data=client.get('/api/data').json()
    data['meters'][0]['transformerId']='inexistente'
    assert client.put('/api/data',json=data).status_code==422
    assert client.post('/api/reset',headers={'Origin':'https://example.org'}).status_code==403

def test_inference_has_no_label_dependency(client):
    a=client.post('/api/analyze',json={'temperature':35}).json()['detections']
    data=client.get('/api/data').json()
    data['labels']=[]; data['meta']={}
    assert client.put('/api/data',json=data).status_code==200
    b=client.post('/api/analyze',json={'temperature':35}).json()['detections']
    assert a==b

def test_persistence_on_restart(client):
    data=client.get('/api/data').json()
    data['zones'][0]['name']='Persistencia'
    assert client.put('/api/data',json=data).status_code==200
    from backend.api import app
    with TestClient(app) as restarted:
        assert restarted.get('/api/data').json()['zones'][0]['name']=='Persistencia'
        assert restarted.get('/api/results').json()['status']=='sin análisis'
    assert client.post('/api/reset').status_code==200
