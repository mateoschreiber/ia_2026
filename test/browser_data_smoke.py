"""Prueba importación y edición de la interfaz y restaura el JSON original."""
import json
import urllib.request
from playwright.sync_api import sync_playwright

BASE='http://127.0.0.1:8000'
def request(method='GET', obj=None):
    payload=json.dumps(obj,ensure_ascii=False).encode() if obj is not None else None
    req=urllib.request.Request(BASE+'/api/data',data=payload,method=method,
                               headers={'Content-Type':'application/json'} if payload else {})
    with urllib.request.urlopen(req,timeout=30) as response:
        return json.load(response)

original=request()
try:
    with sync_playwright() as p:
        browser=p.chromium.launch(headless=True,executable_path=r'C:\Program Files\Google\Chrome\Application\chrome.exe')
        page=browser.new_page()
        page.goto(BASE,wait_until='networkidle',timeout=60000)
        page.get_by_role('button',name='Gestión de datos').click()
        page.get_by_label('Nombre',exact=True).fill('Zona prueba temporal')
        page.get_by_role('button',name='Guardar nombre').click()
        page.get_by_text('Datos guardados · análisis invalidado').wait_for(timeout=30000)
        assert request()['zones'][0]['name']=='Zona prueba temporal'
        page.get_by_label('Entidad').select_option('meters')
        page.get_by_label('Tarifa').fill('PRUEBA')
        with page.expect_response(lambda response: response.url.endswith('/api/data') and response.request.method=='PUT',timeout=30000) as save:
            page.get_by_role('button',name='Guardar campos').click()
        assert save.value.status==200
        assert request()['meters'][0]['tariff']=='PRUEBA'
        with page.expect_response(lambda response: response.url.endswith('/api/data') and response.request.method=='PUT',timeout=30000) as upload:
            page.locator('input[type=file]').set_input_files({
                'name':'original.json','mimeType':'application/json',
                'buffer':json.dumps(original,ensure_ascii=False).encode()
            })
        assert upload.value.status==200
        assert request()==original
        page.on('dialog',lambda dialog:dialog.accept())
        with page.expect_response(lambda response: response.url.endswith('/api/reset'),timeout=30000) as reset:
            page.get_by_role('button',name='Restaurar',exact=True).click()
        assert reset.value.status==200
        browser.close()
finally:
    request('PUT',original)
    assert request()==original
print('Edición, importación y restauración verificadas; base original restituida')
