"""Reproduce el experimento de referencia sin modificar el volumen de la app."""
import json
from pathlib import Path
from backend.ml import train

root = Path(__file__).resolve().parent.parent
if __name__ == '__main__':
    data = json.loads((root/'data'/'database.json').read_text(encoding='utf-8'))
    report = train(data)['report']
    out = root/'docs'/'resultados_experimento.json'
    out.write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
    print('Resultados escritos en', out)
    print('Anomalías:', report['anomaly']['selected'], report['anomaly']['test'])
    print('Pronóstico:', report['forecast']['selected'], report['forecast']['test'])
