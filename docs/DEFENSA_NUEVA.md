# Defensa y demostración — sistema con API

## Guion de 10 minutos

1. **0:00–1:00 · Problema.** Explicar que se estudia la priorización de inspecciones y picos de demanda en un contexto paraguayo, sin afirmar acceso a la red de ANDE.
2. **1:00–2:30 · Datos.** Mostrar 100 medidores sintéticos, 5 zonas, 20 transformadores y un año horario; explicar la generación y que solo hay siete etiquetas positivas.
3. **2:30–4:00 · Metodología.** Explicar particiones por medidor y por fecha, estandarización solo con entrenamiento, modelos candidatos, selección en validación y prueba reservada.
4. **4:00–7:00 · Demostración.** Con Docker preparado, abrir el dashboard, introducir 35 °C y factor 0,90, ejecutar análisis, mostrar picos, puntuaciones y alertas separadas. Editar el nombre de una zona, guardar y demostrar que se invalidan los resultados. Volver a ejecutar. Mostrar `/docs` y la sección de métricas.
5. **7:00–8:30 · Resultados.** Leer los resultados del experimento desde la interfaz y `docs/resultados_experimento.json`; comparar MAE/RMSE con la referencia de persistencia. Identificar la temperatura futura como escenario idealizado.
6. **8:30–10:00 · Discusión.** Explicar la única etiqueta positiva en prueba, los datos simulados, las zonas compartidas y que el score no es probabilidad ni prueba de fraude. Proponer nuevos datos y evaluación externa.

## Preguntas posibles

- **¿Por qué no es un detector operativo de fraude?** Son señales sobre datos sintéticos; no existe validación con inspecciones ni calibración probabilística.
- **¿Qué evita filtración?** Las variables excluyen etiquetas y metadatos; el ajuste usa solo entrenamiento y la elección se hace en validación. El pronóstico respeta orden temporal.
- **¿Por qué no ganó Isolation Forest?** El modelo se seleccionó por F1 de validación; con solo dos positivos esa elección es muy inestable.
- **¿La temperatura es pronosticada por el sistema?** No. La ingresa el usuario. En el experimento se usa la observada como escenario idealizado.
- **¿Qué ocurre si cambia la base?** Se invalidan resultados y hay que volver a ejecutar inferencia; el modelo no se reentrena con datos importados.
- **¿Cómo se calcula la sobrecarga?** Se compara el máximo horario en kW con kVA por el factor de potencia supuesto; es un indicador simplificado.
