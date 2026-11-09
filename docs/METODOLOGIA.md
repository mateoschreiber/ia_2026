# Metodología y datos

## Procedencia y unidades

El generador `generator/generate.py` construye una red ficticia de 5 zonas, 20 transformadores y 100 medidores con 8.760 lecturas horarias de 2025. Tiene siete arquetipos de pérdida no técnica o falla simulados y semilla 42. Los perfiles, el clima y las pérdidas son supuestos del generador, no registros ni estimaciones oficiales de ANDE. `data/database.json` es la muestra de referencia. La fecha y los identificadores son sintéticos.

| Campo | Unidad / significado |
|---|---|
| `zones.id`, `name` | Identificador y nombre de zona ficticia. |
| `transformers.zoneId`, `capacityKva`, `energySuppliedKwh` | Zona, capacidad aparente en kVA y energía anual suministrada en kWh. |
| `meters.transformerId`, `customerType` | Transformador y perfil de cliente. |
| `readings.start`, `intervalH`, `kwh` | Inicio, intervalo en horas y vector de energía en kWh por intervalo. |
| `weather.start`, `intervalH`, `tempC` | Inicio, intervalo y temperatura horaria en °C. |
| `labels.meterId`, `isFraud`, `archetype` | Etiqueta del generador, usada solo para particionar y evaluar. Incluye fallas y no implica fraude real. |
| `meta` | Metadatos del generador; puede contener identificadores de anomalías y nunca se usa como variable predictora. |

## Detección

Se extraen por medidor media, desviación, percentil 95, proporción de ceros, medias nocturna y vespertina, y coeficiente de variación. Las características no usan etiquetas, metadatos de fraude ni estadísticas de otros medidores. Se dividen medidores 60/20/20 de manera estratificada con semilla 42. La escala, modelos y umbral del percentil 90 se ajustan solo en entrenamiento, que puede contener anomalías. Se selecciona por F1 en validación entre Isolation Forest y la distancia euclidiana al centro de variables estandarizadas; la prueba se reserva para el informe final. El orden está basado en score, no en probabilidad calibrada.

La partición fija no equivale a un estudio poblacional: hay siete casos positivos, solo dos en validación y uno en prueba. La asignación por arquetipo no garantiza representar cada tipo en cada conjunto. La selección puede cambiar con una sola observación. Un diseño futuro debe usar más simulaciones independientes y datos de campo consentidos. El autoencoder del prototipo histórico no se compara aquí porque no cuenta con este protocolo independiente.

## Pronóstico y cargas

Se suman por zona las energías horarias de los medidores. El máximo de un intervalo de una hora se expresa como kW medio en esa hora. Para cada zona y día a partir del octavo se usan como entradas la temperatura máxima de ese día (escenario idealizado), el pico del día anterior y el de siete días antes. El objetivo es el pico del día. Se separan días cronológicamente en 60/20/20; durante validación y prueba se utilizan picos ya observados, nunca futuros. Los candidatos son Ridge con términos cuadráticos y bosque aleatorio; se elige por MAE de validación y se reportan MAE y RMSE en prueba junto a la referencia de persistencia (pico anterior). La prueba comparte zonas con entrenamiento y utiliza temperatura observada como si fuese conocida el día anterior: los errores son optimistas respecto de una aplicación con pronósticos meteorológicos imperfectos.

La alerta de carga usa `pico_kW / (capacidad_kVA × factor_potencia)` y umbral de 75 %; el factor es hipotético. El balance compara energía suministrada y suma facturada anual, por lo que sus porcentajes solo son coherentes si ambas magnitudes cubren el mismo periodo. Si falta suministro positivo se presenta como no disponible. Las alertas son reglas de demostración, no evaluación técnica de una red.

## Referencias

1. F. T. Liu, K. M. Ting y Z.-H. Zhou, “Isolation Forest,” *2008 Eighth IEEE International Conference on Data Mining*, 2008, doi: [10.1109/ICDM.2008.17](https://doi.org/10.1109/ICDM.2008.17).
2. scikit-learn, “[Common pitfalls and recommended practices](https://scikit-learn.org/stable/common_pitfalls.html)”, consultado el 9 de noviembre de 2026.
3. scikit-learn, “[Cross-validation: evaluating estimator performance](https://scikit-learn.org/stable/modules/cross_validation.html)”, consultado el 9 de noviembre de 2026.
