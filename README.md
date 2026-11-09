# Observatorio energético — Proyecto 11 de IA aplicada

Prototipo académico de predicción del pico eléctrico diario por zona y detección de señales anómalas en medidores. **Todos los datos son sintéticos**; no hay conexión con ANDE y una alerta no demuestra fraude ni sustituye una inspección.

## Inicio con Docker

Requiere Docker Desktop con Docker Compose iniciado. Desde esta carpeta:

```sh
docker compose up --build
```

Abrir <http://localhost:8000>. La primera ejecución entrena los modelos con el conjunto de ejemplo; puede tardar. El JSON, los modelos y las métricas se guardan en el volumen `energia_data`, que sobrevive a reinicios. Para detener: `docker compose down` (no elimina el volumen). En la interfaz, **Restaurar datos de ejemplo** sustituye el JSON editable; no elimina los modelos ni el volumen. Para extraer los datos usar **Exportar JSON**.

El servicio escucha únicamente en la computadora local. Es una demostración sin cuentas ni autenticación: no exponer el puerto a Internet ni ingresar información personal o datos operativos sensibles. El volumen de modelos es confiable: nunca sustituir archivos `joblib` por otros de origen desconocido.

## Uso

1. Seleccionar zona, transformador y medidor. El análisis de referencia se calcula al cargar.
2. Explorar Supervisión, Anomalías, Demanda y Evaluación; abrir Laboratorio para comparar temperatura y cambios temporales de consumo. Los escenarios no se guardan.
3. En Gestión se puede importar/exportar el JSON original o modificar registros. El servidor valida el conjunto completo y cualquier cambio invalida el análisis previo. Los modelos siguen siendo los entrenados con los datos de ejemplo.
4. `/docs` muestra la documentación interactiva de la API y necesita conexión para cargar Swagger UI desde su CDN; el dashboard y la API funcionan localmente. El esquema de la API también está disponible sin conexión en `/openapi.json`. `GET /api/metrics` entrega el experimento de referencia, no una evaluación del archivo importado.

Las series importadas deben estar sincronizadas: un registro por medidor, igual fecha de inicio, intervalo de una hora y entre 14 y 366 días completos. Temperaturas en °C; energía en kWh por intervalo de una hora, equivalente numéricamente a potencia media en kW durante ese intervalo. El balance requiere energía suministrada positiva. Las alertas de carga comparan kW con `kVA × factor de potencia` supuesto, no una medición de potencia aparente.

## Experimento y pruebas

Para desarrollo fuera del contenedor, con Python 3.12:

```sh
python -m venv .venv
python -m pip install -r requirements.txt
python -m backend.experiment
python -m pytest -q test/test_system.py
```

El comando de experimento actualiza `docs/resultados_experimento.json`. El entrenamiento separa medidores estratificadamente en 60/20/20; usa etiquetas para crear la partición y elegir el modelo en validación, nunca como características. Compara Isolation Forest con distancia estandarizada; el umbral es el percentil 90 de puntuaciones de entrenamiento. El pronóstico separa cronológicamente 60/20/20 de días, compara regresión polinómica Ridge y bosque aleatorio, y evalúa contra el pico del día anterior. Las temperaturas observadas en prueba representan un **escenario idealizado**, no una previsión meteorológica real. La evaluación temporal comparte zonas y no mide generalización a zonas nuevas.

Para ejecutar las pruebas automatizadas dentro de Docker, desde la raíz del proyecto:

```sh
docker compose run --rm --no-deps -v "./test:/app/test:ro" --entrypoint python energia -m pytest -q -p no:cacheprovider test/test_system.py
```

Con el servicio iniciado, `python test/docker_persistence.py` comprueba la persistencia tras reiniciar y restaura el JSON original. Durante esta prueba no se deben editar datos en otra ventana. La prueba opcional `test/browser_smoke.py` utiliza Playwright para Python y Chrome instalado en Windows; también restaura la base, por lo que tampoco debe ejecutarse mientras otra persona la edita.

Con semilla 42, el resultado incluido seleccionó distancia para anomalías y bosque aleatorio para pronóstico. La prueba de anomalías contiene solo un positivo de 20 medidores, por lo que F1 y recall son especialmente inestables. Ver [metodología](docs/METODOLOGIA.md) y [resultados completos](docs/resultados_experimento.json).

## Organización

- `backend/`: extracción de variables, experimentos, modelos y API FastAPI.
- `web/`: interfaz React y TypeScript, construida con Vite y gráficos Apache ECharts. Docker sirve el resultado y sus recursos locales.
- `data/database.json` y `generator/generate.py`: datos emulados y generador original.
- `docs/`: metodología, resultados, informe y defensa.
- `src/`, `index.html`, `assets/` y `test/run-tests.js`: prototipo histórico estático; no son la interfaz ni el motor del servicio actual. Su documentación anterior describe esa versión y sus métricas no son comparables directamente con el experimento nuevo.

El informe y la defensa requieren revisión de los integrantes; completar datos de autoría e institución antes de entregar.

La [guía de algoritmos y componentes](docs/GUIA_ALGORITMOS.md) explica fórmulas, gráficos, bibliotecas y límites. Los colores azul #003B71 y rojo #D71920 son aproximaciones digitales inspiradas en ANDE.

Para desarrollar la interfaz ejecutar `npm ci` y `npm run build` en `web/`. Docker compila la interfaz automáticamente. El artefacto se versiona en el volumen; al migrar se conserva `model.v1.backup.joblib` y se verifica que los resultados publicados no cambien.
