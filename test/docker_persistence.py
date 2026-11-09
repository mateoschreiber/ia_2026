"""Comprueba persistencia real en Compose y restaura exactamente el JSON original.

Requiere el servicio local ya iniciado. Ejecutar desde la raíz del repositorio.
"""
import copy
import json
import subprocess
import time
import urllib.error
import urllib.request

BASE = 'http://127.0.0.1:8000'


def request(path, method='GET', data=None):
    payload = json.dumps(data, ensure_ascii=False).encode('utf-8') if data is not None else None
    req = urllib.request.Request(BASE + path, data=payload, method=method,
                                 headers={'Content-Type': 'application/json'} if payload else {})
    with urllib.request.urlopen(req, timeout=30) as response:
        return json.load(response)


def wait_ready():
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline:
        try:
            if request('/api/health')['status'] == 'ok':
                return
        except (OSError, urllib.error.URLError):
            time.sleep(1)
    raise RuntimeError('El servicio no volvió a estar disponible después del reinicio')


original = request('/api/data')
try:
    changed = copy.deepcopy(original)
    changed['zones'][0]['name'] = 'Prueba temporal de persistencia'
    request('/api/data', 'PUT', changed)
    subprocess.run(['docker', 'compose', 'restart', 'energia'], check=True)
    wait_ready()
    assert request('/api/data')['zones'][0]['name'] == changed['zones'][0]['name']
    assert request('/api/results')['status'] == 'sin análisis'
    print('Persistencia del JSON e invalidación tras reiniciar: OK')
finally:
    wait_ready()
    request('/api/data', 'PUT', original)
    assert request('/api/data') == original, 'No se pudo restaurar el JSON original'
    print('Datos originales restaurados y verificados')
