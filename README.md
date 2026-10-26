# Supervisión Energética — Proyecto Final IA

Aplicación **100 % estática** (HTML + CSS + JavaScript) para el Proyecto 11:
*Predicción de picos de consumo eléctrico y detección de pérdidas no técnicas*
sobre datos **emulados** con fines educativos (contexto ANDE).

- Sin servidor, sin build, sin base de datos externa.
- Una única base de datos: `data/database.json`.
- Dashboard + pantalla CRUD para editar los datos.
- Chart.js vendoreado para funcionar sin internet.
- Requisitos y entorno de desarrollo: ver [REQUIREMENTS.md](REQUIREMENTS.md).

---

## Cómo abrir

1. Abrir `index.html` con doble clic (Chrome/Edge recomendado).
2. En la pantalla de inicio, pulsar **“Abrir base de datos”** y seleccionar
   `data/database.json` (o arrastrarlo y soltarlo sobre la ventana).
3. A partir de ahí los datos quedan cacheados en **IndexedDB** y la app
   recuerda el estado al reabrirla.
4. **Guardar** escribe de vuelta al `.json` en Chrome/Edge (File System Access
   API). En otros navegadores descarga una copia que se puede volver a cargar.

> **¿Por qué hay que abrir el archivo la primera vez?**
> El navegador bloquea `fetch()` de archivos locales cuando la página se abre
> con `file://` (política CORS). Para usar un `.json` real como base de datos
> sin servidor, el archivo se abre con el selector de archivos. La caché
> (IndexedDB) solo acelera el reabrir; la fuente canónica sigue siendo el `.json`.

> **¿Por qué IndexedDB y no `localStorage`?**
> El dataset anual (100 medidores × 8760 h) ocupa ~12 MB, por encima del límite
> de `localStorage` (~5 MB). IndexedDB admite volúmenes mayores; se usa como
> caché y `localStorage` queda solo como respaldo para datasets pequeños.

> **¿Por qué scripts clásicos y no ES Modules?**
> Los `import` de ES Modules también están bloqueados bajo `file://`. Por eso
> todo el código usa scripts clásicos con un namespace global `App`.

---

## Estructura

```
Proyecto final IA/
├─ index.html
├─ README.md
├─ REQUIREMENTS.md          # requisitos (runtime, Python, Node, gh)
├─ data/
│  └─ database.json          # base de datos canónica (una sola)
├─ generator/
│  └─ generate.py            # generador de datos emulados (Python)
├─ test/
│  └─ run-tests.js           # pruebas del motor (Node.js)
├─ assets/
│  ├─ css/main.css
│  └─ vendor/chart.umd.js    # Chart.js 4.4.1
└─ src/
   ├─ core/
   │  ├─ events.js           # bus de eventos
   │  ├─ schema.js           # definición de entidades y campos
   │  ├─ validator.js        # validación de dataset y entidades
   │  ├─ store.js            # estado + caché IndexedDB
   │  ├─ fileStore.js        # abrir/guardar el .json
   │  └─ repository.js       # CRUD genérico
   ├─ analysis/
   │  ├─ rng.js              # PRNG determinista (mulberry32)
   │  ├─ features.js         # extracción de features por medidor
   │  ├─ balance.js          # balance energético
   │  ├─ anomaly.js          # estadística (z-score, IQR)
   │  ├─ isolationForest.js  # Isolation Forest
   │  ├─ autoencoder.js      # autoencoder (in-browser)
   │  ├─ forecast.js         # pronóstico de picos por zona
   │  └─ engine.js           # orquestador (detections/forecast/alerts)
   ├─ ui/
   │  ├─ dom.js, i18n.js, router.js
   │  ├─ components/         # kpi, chart, table, form
   │  └─ views/              # home, dashboard, crud, metrics
   └─ main.js
```

---

## Formato de la base de datos

```jsonc
{
  "schemaVersion": 1,
  "meta": { "generatedAt": "...", "seed": 42, "intervalH": 1 },
  "zones":        [{ "id": "z001", "name": "Centro", "description": null }],
  "transformers": [{ "id": "t001", "zoneId": "z001", "capacityKva": 400 }],
  "meters":       [{ "id": "m001", "transformerId": "t001", "customerType": "residencial", "active": true }],
  "readings":     [{ "meterId": "m001", "start": "2025-01-01T00:00:00", "intervalH": 1, "kwh": [/* 8760 */] }],
  "weather":      { "start": "2025-01-01T00:00:00", "intervalH": 1, "tempC": [/* 8760 */], "humidity": [/* 8760 */] },
  "labels":       [{ "id": "l001", "meterId": "m001", "isFraud": false, "archetype": null }],
  "detections":   [],
  "forecast":     [],
  "alerts":       []
}
```

Las lecturas se guardan **compactadas** (un vector de valores por medidor) para
que 100 medidores × 8760 horas quepan en un archivo manejable (~5–8 MB).

---

## Fases del proyecto

| Fase | Contenido | Estado |
|---|---|---|
| F0 | Esqueleto, carga/guardado del JSON, navegación, estilos | **Hecho** |
| F1 | Generador de datos emulados (100 medidores, 1 año) | **Hecho** |
| F2 | CRUD completo por entidad | **Hecho** |
| F3 | Motor de análisis (Isolation Forest, pronóstico, balance) | **Hecho** |
| F4 | Dashboard completo | **Hecho** |
| F5 | Métricas del modelo y pulido | Pendiente |
| F6 | Documentación y guía de defensa | Pendiente |

---

## Generador de datos (F1)

El dataset se regenera con un script de desarrollo determinista:

```sh
python3 generator/generate.py
```

Produce `data/database.json` con:
- 5 zonas, 20 transformadores, 100 medidores (75 % residencial, 20 % comercial, 5 % industrial).
- 8760 horas de lecturas por medidor + clima horario (temperatura, humedad).
- Consumo = base × perfil horario × factor estacional × **respuesta térmica** (no lineal, para picos de calor) × ruido AR(1).
- **IDs aleatorios alfanuméricos** (sin prefijo secuencial), como los `CONS_NO`
  de los datasets reales (SGCC), para no filtrar estructura artificial en el análisis.
- 7 medidores con pérdida no técnica (`isFraud: true`), un arquetipo cada uno:
  `bypass_total`, `bypass_parcial`, `inversion_fase`, `manipulacion_nocturna`,
  `conexion_directa`, `fraude_intermitente`, `medidor_defectuoso`.
- `transformers[].energySuppliedKwh` = consumo **real** total + pérdidas técnicas,
  de modo que el balance energético (suministrado − facturado) revele la pérdida no técnica.

Las **etiquetas** (`labels`) son el *ground truth* para evaluar los modelos (F3/F5).

---

## Motor de análisis (F3)

`src/analysis/` implementa la detección de anomalías y el pronóstico, todo en
JavaScript puro (sin servidor). Al cargar la base de datos y al editarla por
CRUD, el motor se **recalcula automáticamente** y escribe los resultados en
`dataset.detections`, `dataset.forecast` y `dataset.alerts`.

| Módulo | Método | Resultado |
|---|---|---|
| `features.js` | 11 features por medidor (total, media, desvío, cv, zeroRatio, ratios día/noche/tarde, pico, comparación con vecindario y con el tipo de cliente) | matriz de features estandarizada |
| `isolationForest.js` | Isolation Forest (Liu 2008), 100 árboles | score de anomalía por medidor |
| `autoencoder.js` | Autoencoder de 1 capa oculta entrenado in-browser (gradiente descendente, determinista) | error de reconstrucción como score |
| `forecast.js` | Modelo aditivo de pico vs temperatura + percentil 95 (OLS) | pico pronosticado por zona |
| `engine.js` | Combina scores (IF + autoencoder + estadístico), umbral por percentil 90 | detections, forecast, alerts |

**Alertas generadas:** sobrecarga de transformadores (carga pico vs capacidad),
pérdidas por balance energético (suministrado − facturado) y medidores con alta
probabilidad de pérdida no técnica.

> **Interpretación honesta (para F5):** con datos emulados, los arquetipos
> "evidentes" (bypass total, inversión de fase, manipulación nocturna) se
> detectan con score alto; los de escalado uniforme o intermitentes son
> intrínsecamente más difíciles, como ocurre en la literatura. La vista de
> métricas (F5) reportará `precision@k` y recall contra las etiquetas.
