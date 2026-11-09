"""Emite el experimento de referencia como JSON sin modificar datos ni modelos."""
import json
from pathlib import Path
from backend.ml import train

root = Path(__file__).resolve().parent.parent
if __name__ == '__main__':
    data = json.loads((root/'data'/'database.json').read_text(encoding='utf-8'))
    report = train(data)['report']
    print(json.dumps(report, indent=2))
