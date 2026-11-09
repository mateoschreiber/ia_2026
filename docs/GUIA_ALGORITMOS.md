# Guía de algoritmos y componentes

Material de apoyo de Inteligencia Artificial para la versión React/FastAPI/Docker. El guion de exposición está en [DEFENSA.md](DEFENSA.md) y la lista de evidencias en [ENTREGA.md](ENTREGA.md).

Este prototipo usa datos sintéticos y representa una red lógica. Las visualizaciones describen cálculos reales, y una anomalía no es una prueba de fraude.

## Del dato al resultado

El generador crea lecturas de kWh por hora, temperatura y etiquetas simuladas. Los medidores se dividen 60/20/20 para detección, y los días 60/20/20 cronológicamente para pronóstico, con semilla 42. Se ajustan variables y modelos con entrenamiento; validación elige los candidatos y la prueba evalúa el elegido. El laboratorio usa una copia temporal, sin reentrenar.

## Distancia estandarizada

Se extraen media, desviación estándar, percentil 95, proporción de ceros, medias nocturna y vespertina y coeficiente de variación. El escalador resta la media y divide por la desviación aprendidas en entrenamiento. Cada barra es el cuadrado de una variable estandarizada; la raíz de la suma es el score. Se compara con el percentil 90 de scores de entrenamiento. Un score mayor indica un perfil más alejado del centro aprendido; no es probabilidad.

## Isolation Forest

Usa las mismas variables con su propio escalador y 150 árboles de particiones aleatorias. La interfaz muestra las decisiones reales de un árbol: variable, valor estandarizado, corte y rama. La puntuación es la del bosque completo, con el signo de score_samples invertido para que mayor signifique más anómalo. Su umbral es el percentil 90 de sus scores de entrenamiento.

Un camino corto puede aportar evidencia de aislamiento, pero una hoja puede contener varias muestras y la longitud efectiva incluye una corrección. Un árbol aislado no determina la puntuación global. Se compara F1 de validación; los scores y umbrales de candidatos tienen escalas distintas. En la partición publicada ganó distancia, con pocos positivos.

## Random Forest de demanda

Las entradas son temperatura máxima hipotética del día siguiente, pico observado del día anterior y pico de siete días antes. El bosque seleccionado tiene 100 árboles de regresión. Cada barra es una predicción real; el promedio coincide con la predicción del bosque. Los resultados se expresan como kW medios durante una hora, equivalentes numéricamente al kWh registrado en esa hora.

La curva de sensibilidad modifica temperatura y mantiene fijos los dos picos anteriores. Muestra la respuesta del modelo, no una relación causal. En la evaluación se usó la temperatura observada del día objetivo como escenario idealizado; un pronóstico meteorológico real incorporaría error adicional. Las zonas de prueba también aparecen en entrenamiento.

## Evaluación y gráficos

La matriz de confusión contrasta el detector seleccionado con etiquetas sintéticas. Precisión @ k es la proporción de positivos entre los primeros k del ranking. MAE es la media del error absoluto; RMSE penaliza más errores grandes. La referencia de persistencia usa el pico del día anterior. La serie de prueba compara observaciones, predicciones guardadas y referencia, sin cambiar con el laboratorio.

La muestra publicada tiene solo un positivo en prueba de anomalías. Una sola clasificación cambia drásticamente el recall. Los resultados no demuestran comportamiento en campo.

## Laboratorio y límites

La reducción uniforme escala toda la serie del medidor; la nocturna solo las horas 00:00–05:59; la interrupción pone a cero un tramo indicado en horas desde el inicio. El escenario compara predicciones con el mismo modelo y no persiste cambios. Si el score permanece bajo el umbral, es un resultado válido; no se producen métricas científicas a partir de perturbaciones manuales.

Las alertas de carga comparan kW con kVA por el factor de potencia supuesto. El balance depende de energía suministrada positiva y de que cubra el mismo período que las lecturas.

## Componentes y dependencias

| Componente | Función |
|---|---|
| backend/ml.py | Características, particiones, candidatos, ajuste, selección y métricas. |
| backend/visual.py | Series, recorridos y contribuciones reales; simulación y revisión de datos. |
| backend/api.py | Validación, API REST, guardado, migración y servicio del frontend. |
| web/src/main.tsx | Vistas React, selección compartida, gráficos, laboratorio y exposición. |
| web/src/style.css | Diseño, colores, distribución y movimiento reducido. |
| React y React DOM | Estado e interacción de las vistas. |
| TypeScript | Comprobación de tipos al construir. |
| Vite | Compilación de la interfaz en archivos locales para Docker. |
| Apache ECharts | Series, barras, dispersión y mapa de calor interactivos. |
| Lucide React | Iconos vectoriales. |
| FastAPI y Uvicorn | Validación y servicio REST local. |
| NumPy, scikit-learn y joblib | Cálculo numérico, modelos y persistencia de artefactos confiables. |
| pytest y httpx | Pruebas de API y flujos. |

Fuentes: [Isolation Forest](https://scikit-learn.org/1.6/modules/generated/sklearn.ensemble.IsolationForest.html), [Random Forest](https://scikit-learn.org/1.6/modules/generated/sklearn.ensemble.RandomForestRegressor.html), [Apache ECharts](https://echarts.apache.org/en/feature.html) y [especificaciones del logotipo ANDE](https://mecip.ande.gov.py/images/sima/Intranet/organizacion_y_procesos/Manual%20de%20Procedimientos/Cap.%2001%20Gest.%20Estrategica%20Institucional/PEI-07%20Formularios/ANEXOS/1.%20Especificaciones%20Tecnicas%20Logotipo%20ANDE.pdf). Los colores digitales #003B71 y #D71920 son aproximaciones de diseño, no códigos oficiales certificados.
