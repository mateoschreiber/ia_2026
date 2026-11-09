"""Datos y explicaciones reproducibles para la interfaz; no escribe la base."""
from copy import deepcopy
from datetime import datetime, timedelta
import hashlib
import json

import numpy as np

from backend.ml import FEATURE_NAMES, analyze, features, forecast_rows


def revision(data):
    payload = json.dumps(data, sort_keys=True, ensure_ascii=False, separators=(',', ':'))
    return hashlib.sha256(payload.encode('utf-8')).hexdigest()


def dataset_series(data, meter_id, zone_id):
    readings = {r['meterId']: r['kwh'] for r in data['readings']}
    if meter_id not in readings:
        raise ValueError('Medidor inexistente')
    if zone_id not in {z['id'] for z in data['zones']}:
        raise ValueError('Zona inexistente')
    meter = np.asarray(readings[meter_id], dtype=float)
    start = datetime.fromisoformat(data['weather']['start'])
    # The final seven days provide enough detail without transferring a year per graph.
    first = max(0, len(meter) - 168)
    profile = [{'hour': i, 'timestamp': (start + timedelta(hours=i)).isoformat(),
                'kwh': float(meter[i])} for i in range(first, len(meter))]
    daily = [r for r in forecast_rows(data) if r[1] == zone_id]
    return {
        'profile': profile,
        'daily_peaks': [{'date': r[2], 'kw': float(r[4])} for r in daily],
        'heatmap': [{'day': (start + timedelta(hours=i)).date().isoformat(),
                     'hour': i % 24, 'kwh': float(meter[i])}
                    for i in range(first, len(meter))],
    }


def meter_explanation(data, bundle, meter_id, tree_index=0):
    reading = next((r for r in data['readings'] if r['meterId'] == meter_id), None)
    if reading is None:
        raise ValueError('Medidor inexistente')
    vector = np.asarray(features(reading['kwh']), dtype=float).reshape(1, -1)
    distance = bundle['anomaly_candidates']['distance']
    z = distance.transform(vector)[0]
    contribution = z * z
    score = float(np.linalg.norm(z))
    forest_pipeline = bundle['anomaly_candidates']['isolation_forest']
    forest = forest_pipeline.named_steps['isolationforest']
    transformed = forest_pipeline.named_steps['standardscaler'].transform(vector)
    if tree_index < 0 or tree_index >= len(forest.estimators_):
        raise ValueError('Árbol inexistente')
    tree = forest.estimators_[tree_index]
    feature_indices = forest.estimators_features_[tree_index]
    x = transformed[:, feature_indices].astype(np.float32)
    path = tree.decision_path(x).indices.tolist()
    nodes = []
    for node in path:
        local_index = int(tree.tree_.feature[node])
        if local_index < 0:
            nodes.append({'leaf': True, 'samples': int(tree.tree_.n_node_samples[node])})
        else:
            idx = int(feature_indices[local_index])
            value = float(x[0, local_index]); cutoff = float(tree.tree_.threshold[node])
            nodes.append({'leaf': False, 'feature': FEATURE_NAMES[idx], 'value': value,
                          'threshold': cutoff, 'branch': '≤' if value <= cutoff else '>'})
    isolation_score = float(-forest_pipeline.score_samples(vector)[0])
    return {
        'meterId': meter_id,
        'selected_model': bundle['anomaly_name'],
        'distance': {'score': score, 'threshold': bundle['anomaly_thresholds']['distance'],
                     'variables': [{'name': name, 'value': float(value),
                                    'standardized': float(s), 'squared': float(c)}
                                   for name, value, s, c in zip(FEATURE_NAMES, vector[0], z, contribution)]},
        'isolation_forest': {'score': isolation_score,
                             'threshold': bundle['anomaly_thresholds']['isolation_forest'],
                             'tree_index': tree_index, 'tree_count': len(forest.estimators_),
                             'path': nodes},
    }


def forecast_explanation(data, bundle, zone_id, temperature):
    rows = [r for r in forecast_rows(data) if r[1] == zone_id]
    if len(rows) < 7:
        raise ValueError('Zona sin historial suficiente')
    inputs = [float(temperature), float(rows[-1][4]), float(rows[-7][4])]
    forest = bundle['forecast_candidates']['random_forest']
    predictions = [float(t.predict([inputs])[0]) for t in forest.estimators_]
    scenario_temperatures = np.linspace(max(-30, temperature - 8), min(60, temperature + 8), 17)
    curve = [{'temperature': float(t), 'kw': float(forest.predict([[t, inputs[1], inputs[2]]])[0])}
             for t in scenario_temperatures]
    selected = float(bundle['forecast_model'].predict([inputs])[0])
    return {'zoneId': zone_id, 'inputs': inputs, 'selected_model': bundle['forecast_name'],
            'selected_prediction': max(0.0, selected), 'tree_predictions': predictions,
            'forest_mean': float(np.mean(predictions)), 'sensitivity': curve}


def simulate(data, bundle, meter_id, zone_id, base_temperature, temperature,
             power_factor, operation, amount, start_hour, duration):
    modified = deepcopy(data)
    reading = next((r for r in modified['readings'] if r['meterId'] == meter_id), None)
    if reading is None:
        raise ValueError('Medidor inexistente')
    values = reading['kwh']
    if operation == 'uniform':
        values[:] = [v * (1 - amount / 100) for v in values]
    elif operation == 'night':
        values[:] = [v * (1 - amount / 100) if i % 24 < 6 else v for i, v in enumerate(values)]
    elif operation == 'outage':
        if start_hour >= len(values) or start_hour + duration > len(values):
            raise ValueError('El intervalo excede la serie del medidor')
        values[start_hour:start_hour + duration] = [0.0] * duration
    elif operation != 'none':
        raise ValueError('Operación desconocida')
    original = analyze(data, bundle, base_temperature, power_factor)
    simulated = analyze(modified, bundle, temperature, power_factor)
    def detail(result):
        for rank, item in enumerate(result['detections'], 1):
            if item['meterId'] == meter_id:
                return {'score': item['score'], 'rank': rank, 'flag': item['flag'],
                        'threshold': result['threshold']}
        raise ValueError('Medidor inexistente')
    original_detection = detail(original)
    simulated_detection = detail(simulated)
    original_peak = next((f['peak_kw'] for f in original['forecast'] if f['zoneId'] == zone_id), None)
    simulated_peak = next((f['peak_kw'] for f in simulated['forecast'] if f['zoneId'] == zone_id), None)
    return {
        'original': {'detection': original_detection, 'forecast': original['forecast'],
                     'series': dataset_series(data, meter_id, zone_id),
                     'explanation': meter_explanation(data, bundle, meter_id)},
        'simulated': {'detection': simulated_detection, 'forecast': simulated['forecast'],
                      'series': dataset_series(modified, meter_id, zone_id),
                      'explanation': meter_explanation(modified, bundle, meter_id),
                      'forecast_explanation': forecast_explanation(modified, bundle, zone_id, temperature)},
        'difference': {'score': simulated_detection['score'] - original_detection['score'],
                       'rank': simulated_detection['rank'] - original_detection['rank'],
                       'peak_kw': simulated_peak - original_peak if original_peak is not None and simulated_peak is not None else None},
    }
