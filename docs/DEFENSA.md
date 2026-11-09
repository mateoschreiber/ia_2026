# Defensa oral y demostración

**Asignatura:** Inteligencia Artificial Aplicada

**Ponentes:** Mateo Schreiber y Santiago López

**Duración:** 10 minutos de exposición y demostración + 2 minutos de preguntas.

El reparto siguiente es una propuesta para ensayar, no un registro de aportes individuales al desarrollo.

## Preparación antes de presentar

1. Iniciar Docker Desktop y ejecutar desde la raíz: docker compose up --build -d. Esperar a que http://localhost:8000/api/health responda con estado ok.
2. Abrir http://localhost:8000, comprobar que el análisis de referencia terminó y que se ven las cuatro vistas.
3. Para una demostración reproducible, seleccionar Centro, TR Centro 1 y medidor DAFRL498 del ejemplo. Si se importó otra base, restaurar el ejemplo solo después de exportar los datos que se quieran conservar.
4. Tener preparadas las pestañas del dashboard y de /openapi.json; el esquema de API es local. /docs requiere conexión para cargar Swagger UI.
5. Dejar el laboratorio sin escenario activo. Ensayar con el mismo equipo y proyector.

## Guion de 10 minutos

| Tiempo | Ponente sugerido | Contenido y acción |
|---|---|---|
| 0:00–1:00 | Mateo | **Problema.** Presentar priorización de inspecciones y anticipación del pico zonal en Paraguay. ANDE es el contexto; el experimento usa datos sintéticos. Activar Modo exposición, paso 1. |
| 1:00–2:00 | Mateo | **Datos.** Paso 2: mostrar zona → transformador → medidor. Explicar 5 zonas, 20 transformadores, 100 medidores y 8.760 lecturas horarias por medidor; hay 7 etiquetas positivas simuladas. |
| 2:00–3:00 | Mateo | **Método.** Paso 3: explicar las siete variables y las particiones 60/20/20. El escalado usa entrenamiento; validación selecciona y prueba evalúa. |
| 3:00–5:00 | Mateo | **Demo de anomalías.** Paso 4: perfil, mapa de calor, aportes cuadrados a la distancia y recorrido real de un árbol de Isolation Forest. El bosque completo produce su score; los detectores tienen escalas y umbrales propios. |
| 5:00–7:00 | Santiago | **Demo de demanda y laboratorio.** Paso 5: abrir Laboratorio, probar Día caluroso y comparar picos. En Demanda, mostrar las tres entradas, las salidas de los 100 árboles y el promedio. Aplicar una reducción temporal del medidor, observar score/posición y descartar el escenario. |
| 7:00–8:30 | Santiago | **Resultados.** Paso 6: matriz de confusión, candidatos y comparación con el día anterior. Leer las cifras de la tabla siguiente. Aclarar la única etiqueta positiva en prueba y la temperatura idealizada. |
| 8:30–10:00 | Santiago | **Conclusiones.** Qué ayuda a decidir el sistema, limitaciones y trabajo futuro: más datos, inspecciones autorizadas, evaluación externa y pronóstico meteorológico real. Una señal no confirma fraude. |

## Cifras que deben coincidir

| Resultado | Experimento de referencia |
|---|---|
| Detector seleccionado | Distancia estandarizada; F1 de validación 0,80 frente a 0,50 de Isolation Forest. |
| Prueba de anomalías | 20 medidores, 1 positivo; TN=17, FP=2, FN=0, TP=1. |
| Precisión / recall / F1 | 0,333 / 1,000 / 0,500. |
| Precisión @ 10 | 0,10. |
| Pronóstico seleccionado | Random Forest. |
| MAE / RMSE de pronóstico | 2,36 / 3,35 kW. |
| MAE / RMSE del día anterior | 2,79 / 4,12 kW. |
| Inferencia registrada | 0,196 ms por lote de 20 medidores; 5,445 ms por lote de 365 pares zona-día. Sin lectura, variables, entrenamiento ni HTTP. |

Son tiempos de una sola ejecución, dependientes del equipo y su carga. El laboratorio muestra respuesta del modelo, no métricas científicas nuevas. Una perturbación puede no superar el umbral; mostrar ese resultado con honestidad.

## Dos minutos de preguntas

- **¿Por qué no ganó Isolation Forest?** La distancia tuvo mayor F1 de validación. Solo había dos positivos de validación; la selección es inestable y no demuestra superioridad general.
- **¿El score es probabilidad de fraude?** No. Ordena comportamientos para revisión; puede señalar fallas y requiere inspección.
- **¿Cómo se evita la filtración?** Las etiquetas y metadatos de anomalía no son variables; se separan medidores y el escalado usa entrenamiento. El pronóstico respeta el orden temporal.
- **¿Por qué el recall es 1?** Se detectó el único positivo de prueba. Un solo error lo cambiaría drásticamente.
- **¿Qué predice el bosque de demanda?** El máximo de potencia media horaria del día siguiente por zona, usando temperatura hipotética y picos de uno y siete días atrás.
- **¿Se pronostica el clima?** No. En evaluación se usa temperatura observada como si se conociera anticipadamente.
- **¿Qué cambia el laboratorio?** Una copia temporal. No escribe la base ni reentrena modelos.
- **¿Qué pasa al editar o importar?** Se invalidan resultados y la interfaz solicita automáticamente un análisis nuevo. Los modelos siguen ajustados al ejemplo.
- **¿Cómo se calcula la carga?** Compara kW con kVA por un factor de potencia supuesto; es una simplificación.
- **¿Qué evidencia un sistema completo?** Dataset documentado, modelos, API, UI y Docker; ver [ENTREGA.md](ENTREGA.md).

## Recuperación durante la demostración

Si una vista falla, recargar y consultar el estado del servicio. Si cambió un control, recalcular el escenario antes de usar el resultado. Si Docker se detuvo, iniciarlo y ejecutar docker compose up -d; el JSON y los modelos permanecen en el volumen. Una captura o el informe pueden apoyar la explicación, pero no reemplazan la demostración en vivo exigida.

El ensayo y la presentación acreditan duración y participación; el software no demuestra por sí mismo ocho semanas de trabajo.
