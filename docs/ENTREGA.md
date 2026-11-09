# Lista de entrega — Inteligencia Artificial

**Proyecto 11:** Predicción de picos de consumo eléctrico y detección de pérdidas no técnicas.

**Ponentes:** Mateo Schreiber y Santiago López.

## Requisitos y evidencias

| Requisito | Evidencia | Comprobación |
|---|---|---|
| Investigación e ingesta | Generador determinista, dataset sintético y diccionario. | [Metodología](METODOLOGIA.md), [generador](../generator/generate.py), [dataset](../data/database.json). |
| Modelo entrenado | Artefacto versionado con escaladores, candidatos y umbrales. | Primer arranque: /app/runtime/model.joblib en el volumen Docker; migración con respaldo anterior. |
| Métricas | Precisión, recall, F1, matriz, precisión @ k, MAE, RMSE y tiempos por lote. | [Resultados](resultados_experimento.json), GET /api/metrics y vista Evaluación. |
| API REST | FastAPI con datos, inferencia, explicaciones y simulación. | GET /api/health y /openapi.json; pruebas automatizadas. |
| UI tangible | React, gráficos, laboratorio y modo exposición. | http://localhost:8000; seguir [DEFENSA.md](DEFENSA.md). |
| Contenedores | Frontend compilado y servicio con volumen persistente. | [Dockerfile](../Dockerfile), [Compose](../docker-compose.yml); docker compose up --build. |
| Git con historias | Historial real de fases y evolución del proyecto. | git log --oneline; no se infieren aportes individuales. |
| Informe IEEE | IEEEtran, dos columnas, tres páginas, resumen ≤150 palabras, I–IV, referencias y glosario final. | [PDF](informe_ieee.pdf) y [fuente editable](informe_ieee.tex). |
| Defensa y demo | Guion de 10 minutos + 2 de preguntas. | Ensayar y realizar [DEFENSA.md](DEFENSA.md) con ambos ponentes; requiere presentación efectiva. |
| Pareja y ocho semanas | Dos ponentes e historial disponible. | Los estudiantes aportan la evidencia académica del plazo y la participación real; no se fabrica un cronograma retrospectivo. |

## Verificación técnica desde la raíz

Para instalar Docker y preparar el equipo desde cero en Windows, Linux o macOS, seguir primero la [guía principal de despliegue](../README.md).

~~~sh
docker compose up --build -d
docker compose ps
docker compose run --rm --no-deps -v "./test:/app/test:ro" --entrypoint python energia -m pytest -q -p no:cacheprovider test/test_system.py
~~~

Las pruebas incluyen particiones, validación, explicación numérica, laboratorio sin escritura y migración con respaldo. Para persistencia real ejecutar python test/docker_persistence.py; reinicia el servicio y restaura el JSON original.

Las pruebas de navegador requieren Playwright para Python y Chrome/Edge instalados en Windows:

~~~sh
python test/browser_smoke.py
python test/browser_data_smoke.py
~~~

La primera verifica navegación, laboratorio, exposición, teclado, tamaños y ausencia de recursos externos. La segunda modifica temporalmente datos para probar edición, importación y restauración y restituye el original. No editar la base simultáneamente.

## Documentos vigentes

- [Metodología y diccionario](METODOLOGIA.md).
- [Guía de algoritmos y componentes](GUIA_ALGORITMOS.md).
- [Guion de defensa](DEFENSA.md).
- [Informe IEEE](informe_ieee.pdf) y su fuente editable.
- [Resultados experimentales](resultados_experimento.json).
- [Comprobación de fuentes](FUENTES_VERIFICADAS.md).
