# Comprobación de fuentes

Revisión: **9 de noviembre de 2026**. Las fuentes institucionales sustentan el contexto; no son la procedencia del dataset sintético. Los resultados del proyecto se verifican contra su archivo experimental y la API.

| Fuente oficial | Uso y comprobación |
|---|---|
| [ANDE, Balance Anual de Gestión Pública, año 2025](https://www.ande.gov.py/finanzas/BAGP%202025%20ANDE.pdf) | Respuesta HTTP 200 y PDF de 41 páginas. Página impresa 13: demanda máxima y relación con condiciones climáticas. El visor de búsqueda agotó una solicitud; la descarga directa respondió correctamente. |
| [ANDE, Plan Maestro de Gestión y Control para Reducción de Pérdidas Eléctricas en Distribución](https://www.ande.gov.py/documentos/plan_maestro/Plan%20de%20Reduccion%20de%20Perdidas%202025.pdf) | PDF oficial de 23 páginas. La portada está fechada 21/11/2024 y su encabezado indica 2024–2034; el nombre del archivo contiene 2025. Se cita el título y la fecha del documento, no se infiere su fecha del nombre del archivo. Sustenta monitoreo y control de pérdidas. |
| [Liu, Ting y Zhou, Isolation Forest, DOI 10.1109/ICDM.2008.17](https://doi.org/10.1109/ICDM.2008.17) | El DOI redirige a IEEE Xplore, documento 4781136. IEEE exige verificación JavaScript del navegador al acceso automatizado; no es un DOI inexistente. Autoría, título y año coinciden con la referencia del método en la documentación de scikit-learn. |
| [scikit-learn 1.6.1, Common pitfalls and recommended practices](https://scikit-learn.org/1.6/common_pitfalls.html) | Página oficial accesible. Sustenta ajuste de preprocesamiento solo con entrenamiento y prevención de filtraciones. |
| [scikit-learn 1.6.1, Cross-validation: evaluating estimator performance](https://scikit-learn.org/1.6/modules/cross_validation.html) | Página oficial accesible. Sustenta separación de evaluación y orden temporal en series. |
| [scikit-learn 1.6.1, RandomForestRegressor](https://scikit-learn.org/1.6/modules/generated/sklearn.ensemble.RandomForestRegressor.html) | Página oficial accesible; corresponde a la versión fijada por el proyecto. Sustenta el conjunto de árboles de regresión y su promedio. |
| [scikit-learn 1.6.1, IsolationForest](https://scikit-learn.org/1.6/modules/generated/sklearn.ensemble.IsolationForest.html) | Fuente técnica adicional de la guía: particiones, longitud de caminos y score_samples. |
| [Apache ECharts, Features](https://echarts.apache.org/en/feature.html) | Documentación del fabricante sobre visualización e interacciones; se utiliza en la guía de componentes. |
| [ANDE, especificaciones técnicas del logotipo](https://mecip.ande.gov.py/images/sima/Intranet/organizacion_y_procesos/Manual%20de%20Procedimientos/Cap.%2001%20Gest.%20Estrategica%20Institucional/PEI-07%20Formularios/ANEXOS/1.%20Especificaciones%20Tecnicas%20Logotipo%20ANDE.pdf) | Fuente institucional para rojo, blanco y azul. Los valores HEX del prototipo son aproximaciones de diseño, no códigos certificados del manual. |

Las referencias del informe están citadas en el texto y sus enlaces se incluyen en el PDF. Las páginas pueden cambiar o exigir comprobaciones de acceso; la fecha identifica la revisión realizada, no una garantía de disponibilidad futura.
