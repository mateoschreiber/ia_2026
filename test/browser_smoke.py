"""Prueba opcional con Playwright Python y Chrome instalado; requiere servidor local."""
import json
import urllib.request
from playwright.sync_api import sync_playwright

chrome = r'C:\Program Files\Google\Chrome\Application\chrome.exe'
def request_data(method='GET', data=None):
    body=json.dumps(data,ensure_ascii=False).encode('utf-8') if data is not None else None
    req=urllib.request.Request('http://127.0.0.1:8000/api/data',data=body,method=method,
                               headers={'Content-Type':'application/json'} if body else {})
    with urllib.request.urlopen(req,timeout=30) as response:
        return json.load(response)

original=request_data()
try:
  with sync_playwright() as p:
    browser = p.chromium.launch(headless=True, executable_path=chrome)
    page = browser.new_page(viewport={'width': 1440, 'height': 1000})
    errors=[]
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto('http://127.0.0.1:8000', wait_until='networkidle')
    page.get_by_text('Conectado · datos locales').wait_for()
    assert page.locator('#record option').count() == 5
    page.locator('#scenario button').click()
    page.get_by_text('Análisis actualizado').wait_for(timeout=30000)
    assert page.locator('#forecast .row').count()==5
    record=json.loads(page.locator('#editor').input_value())
    record['name']='Zona de prueba'
    page.locator('#editor').fill(json.dumps(record,ensure_ascii=False))
    page.locator('#save-record').click()
    page.get_by_text('Datos guardados; análisis anterior invalidado').wait_for(timeout=30000)
    assert page.locator('#forecast').inner_text().startswith('Ejecutá')
    page.on('dialog', lambda dialog: dialog.accept())
    page.locator('#reset').click()
    page.get_by_text('Conectado · datos locales').wait_for(timeout=30000)
    page.set_viewport_size({'width':390,'height':844})
    assert page.evaluate('document.documentElement.scrollWidth <= innerWidth')
    assert not errors, errors
    browser.close()
finally:
    request_data('PUT',original)
    assert request_data()==original, 'No se pudo restaurar el conjunto de datos original'
print('Interfaz: carga, análisis, edición, invalidación, restauración y vista móvil OK')
