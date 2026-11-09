"""Comprobación de flujos en Chrome y Edge contra el servicio Docker local."""
import json
import os
from pathlib import Path
import urllib.request
from playwright.sync_api import sync_playwright

BASE='http://127.0.0.1:8000'
def data():
    with urllib.request.urlopen(BASE+'/api/data',timeout=30) as response:
        return json.load(response)

original=data()
executables=[
    r'C:\Program Files\Google\Chrome\Application\chrome.exe',
    r'C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe',
]
with sync_playwright() as p:
    for executable in executables:
        if not Path(executable).exists():
            print('No instalado:', executable)
            continue
        browser=p.chromium.launch(headless=True, executable_path=executable)
        page=browser.new_page(viewport={'width':1440,'height':1000}, reduced_motion='reduce')
        errors=[]
        external=[]
        page.on('pageerror', lambda error: errors.append(str(error)))
        page.on('console', lambda msg: errors.append('console: '+msg.text) if msg.type=='error' else None)
        def guard(route):
            if route.request.url.startswith(BASE):
                route.continue_()
            else:
                external.append(route.request.url)
                route.abort()
        page.route('**/*',guard)
        page.goto(BASE, wait_until='networkidle',timeout=60000)
        page.get_by_role('heading',name='Supervisión de la red').wait_for(timeout=30000)
        page.locator('.network-node').first.wait_for()
        page.screenshot(path=os.path.join(os.environ.get('TEMP','.'),'observatorio-desktop-'+Path(executable).stem+'.png'),full_page=True)
        page.keyboard.press('Tab')
        assert page.evaluate('document.activeElement !== document.body'), 'Navegación de teclado sin foco'
        page.get_by_role('button',name='Anomalías',exact=True).click()
        page.get_by_role('heading',name='Detección de anomalías').wait_for()
        page.get_by_text('Cómo se construye la distancia').wait_for(timeout=30000)
        page.screenshot(path=os.path.join(os.environ.get('TEMP','.'),'observatorio-anomalias-'+Path(executable).stem+'.png'),full_page=True)
        page.get_by_role('button',name='Abrir laboratorio').click()
        assert page.evaluate("!!document.activeElement.closest('[role=dialog]')"), 'El foco no entró al diálogo'
        page.keyboard.press('Escape')
        assert page.get_by_role('dialog',name='Laboratorio de escenarios').count()==0
        page.get_by_role('button',name='Abrir laboratorio').click()
        page.get_by_label('Cambio en el medidor').select_option('uniform')
        page.get_by_role('button',name='Comparar escenario').click()
        page.get_by_text('RESULTADO TEMPORAL').wait_for(timeout=60000)
        page.get_by_role('button',name='Ver comparación').click()
        page.get_by_text('Escenario temporal activo').wait_for()
        page.get_by_role('button',name='Demanda',exact=True).click()
        page.get_by_role('heading',name='Pronóstico de demanda').wait_for()
        page.get_by_text('Cada árbol aporta una estimación').wait_for(timeout=30000)
        page.screenshot(path=os.path.join(os.environ.get('TEMP','.'),'observatorio-demanda-'+Path(executable).stem+'.png'),full_page=True)
        page.get_by_role('button',name='Evaluación y método',exact=True).click()
        page.get_by_text('Matriz de confusión').wait_for()
        page.get_by_role('button',name='Modo exposición').click()
        page.get_by_text('RECORRIDO DE EXPOSICIÓN').wait_for()
        page.get_by_role('button',name='Siguiente').click()
        page.get_by_role('button',name='Salir del modo exposición').click()
        for width in (375, 768, 1024, 1440):
            page.set_viewport_size({'width':width,'height':844})
            assert page.evaluate('document.documentElement.scrollWidth <= innerWidth'), f'Desborde horizontal: {width}px'
        page.set_viewport_size({'width':390,'height':844})
        page.screenshot(path=os.path.join(os.environ.get('TEMP','.'),'observatorio-'+Path(executable).stem+'.png'),full_page=True)
        assert not errors, errors
        assert not external, external
        browser.close()
        print(Path(executable).stem+': navegación, modelos, laboratorio, exposición y móvil OK')
assert data()==original, 'El laboratorio modificó la base persistente'
print('Base persistente intacta')
