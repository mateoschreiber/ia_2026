# Guía de defensa

Guía para presentar y defender el proyecto. Incluye guion, demo, preguntas
frecuentes con respuestas y los números clave.

---

## 1. Elevator pitch (30 segundos)

> "Construimos un sistema que resuelve dos problemas de una distribuidora
> eléctrica: anticipar los picos de demanda en olas de calor y detectar
> pérdidas no técnicas (fraude o fallas de medidor). Usamos Isolation Forest,
> un autoencoder y un modelo de pronóstico, todo corriendo en el navegador sin
> servidor. Sobre datos emulados, concentramos 3 de 7 fraudes en las primeras 5
> inspecciones: 60 % de acierto, 8,6 veces mejor que elegir al azar."

---

## 2. Guion de presentación (12–15 minutos)

### 2.1 Contexto y problema (2 min)

- ANDE: ~1,8 millones de usuarios; pérdidas no técnicas por conexiones
  clandestinas y fraude.
- Dos tareas: **(a)** predecir demanda máxima por zona; **(b)** detectar
  medidores/zonas con pérdida no técnica.
- Por qué es difícil: desbalance (2–10 %), etiquetas escasas, drift, adversarial,
  legal.

### 2.2 Datos (2 min)

- No hay datos públicos de ANDE → **datos emulados** con ground truth.
- Modelo generativo: perfil horario × estacionalidad × respuesta térmica × AR(1).
- 7 arquetipos de fraude (bypass total/parcial, inversión de fase, manipulación
  nocturna, conexión directa, intermitente, medidor defectuoso).
- Balance energético: suministrado vs facturado.

### 2.3 Algoritmos (4 min) — **el corazón**

- **Features (11):** nivel, variabilidad, planicidad (cv), zeroRatio, ratios
  día/noche/tarde, comparación con vecindario y con el tipo de cliente.
- **Isolation Forest:** las anomalías se aíslan con menos cortes; score
  $2^{-E[h]/c(n)}$. No supervisado, rápido, robusto.
- **Autoencoder 11→4→11:** aprende a reconstruir lo normal; alto error de
  reconstrucción = anomalía.
- **Score estadístico:** promedio de |z|.
- **Combinación:** 0.45 IF + 0.30 AE + 0.25 stat; umbral = percentil 90.
- **Pronóstico:** pico diario vs temperatura máxima; OLS; percentil 95
  (porque subestimar un pico cuesta más que sobreestimarlo).
- **Balance:** pérdidas = suministrado − facturado; alerta si > 12 %.

### 2.4 Demo en vivo (3 min)

Ver sección 3.

### 2.5 Resultados y honestidad (2 min)

- `precision@5 = 0.60` (vs 0.07 al azar → 8,6×).
- `recall@30 = 0.71`.
- Detecta los 3 arquetipos evidentes; los sutiles quedan más abajo.
- Limitación: datos sintéticos, sin validez de campo.

### 2.6 Mundo real y cierre (2 min)

- Pipeline AMI → MDM → features → modelos → ranking → inspección → feedback.
- Priorización como optimización (knapsack/cobertura).
- Métricas de negocio: hit rate, costo por inspección, ROI.
- Gobernanza: el modelo prioriza inspecciones, no sanciona.

---

## 3. Demo paso a paso

1. Abrir `index.html` → **Inicio** → "Abrir base de datos" →
   `data/database.json`.
2. **Dashboard**:
   - Mostrar KPIs (pico pronosticado, medidores en riesgo, alertas,
     sobrecargas).
   - Gráfico de pronóstico por zona (barras P95 vs línea base).
   - Ranking de medidores: señalar los 3 fraudes en el top.
   - Curva de carga: elegir un medidor marcado y comparar con la media del
     transformador (se ve la anomalía).
   - Tabla de alertas: sobrecargas y pérdidas.
3. **Datos (CRUD)**: editar un medidor (p. ej. cambiar tipo de cliente) y
   mostrar que el motor **se recalcula**.
4. **Métricas**: matriz de confusión, `precision@k` y curva de inspección.
   Explicar el *lift* frente al azar.

> Si no hay internet o falla algo: el proyecto es 100 % local; Chart.js está
> vendoreado.

---

## 4. Números clave para recordar

| Concepto | Valor |
|---|---|
| Medidores / fraude | 100 / 7 (7 %) |
| `precision@5` | 0.60 (3/5) |
| `precision@10` | 0.30 (3/10) |
| `recall@30` | 0.71 (5/7) |
| Lift vs azar (k=5) | 8.6× |
| Matriz de confusión | TP 3, FP 8, FN 4, TN 85 |
| Precision / Recall / F1 | 0.273 / 0.429 / 0.333 |
| Duración del cálculo | ~150 ms (100 medidores × 8760 h) |
| Alertas | 5 sobrecarga + 12 pérdida |

---

## 5. Preguntas frecuentes (y respuestas)

**¿Por qué datos sintéticos?**
No hay acceso a datos AMI de ANDE ni a etiquetas de fraude. Los sintéticos nos
dan ground truth controlado y reproducibilidad. Declaramos que no miden
desempeño real.

**¿Por qué Isolation Forest y no un clasificador supervisado?**
En producción no hay etiquetas al inicio; las inspecciones son caras. IF es no
supervisado y escala. Cuando haya etiquetas, se pasa a XGBoost/Random Forest.

**¿Por qué un autoencoder?**
Captura relaciones no lineales entre features y aprende la "forma de lo normal".
Su error de reconstrucción es una señal complementaria a IF.

**¿Cómo eligieron el umbral?**
Percentil 90: marca ~10 % de medidores, que es la capacidad de inspección. En
producción se elige por costo-beneficio (falso positivo vs fraude no detectado).

**¿Por qué no usan accuracy?**
Con 7 % de fraude, decir "todos normales" da 93 % de accuracy y es inútil. Por
eso usamos `precision@k`, `recall` y lift.

**¿Por qué `precision@10 = 0.30` no es bajo?**
Al azar sería 0.07. Es 4,3× mejor. Y en k=5 es 8,6× mejor. La industria prioriza
concentrar fraudes en pocas inspecciones.

**¿Qué pasa con los fraudes que no detectan?**
Son los de escalado uniforme, intermitentes y defecto de medidor: su señal es
débil o se confunde con clientes de bajo consumo. En la práctica se detectan con
balance de transformador o inspección.

**¿Cómo evitarían falsos positivos?**
Ranking + revisión humana, evidencia explicable, balance energético como
confirmación, y umbral ajustado por costo. Nunca sanción automática.

**¿Cómo lo llevarían a producción?**
AMI → MDM → feature store → modelos → ranking → inspección → feedback. Con
Spark/Kafka para escala, MLflow para MLOps, monitoreo de drift y reentrenamiento.

**¿Cómo manejan el drift?**
Monitoreo de distribución de scores y hit rate; reentrenamiento periódico;
validación temporal; champion/challenger.

**¿Qué pasa si el defraudador adapta su comportamiento?**
Es un problema adversarial. Se combinan señales (consumo, balance, topología) y
se rota el patrón de control; no se depende de un único modelo.

**¿Dónde entra la IA clásica?**
Reglas del dominio, balance energético, razonamiento con incertidumbre y
**optimización de la priorización de inspecciones** (knapsack/cobertura).

**¿Por qué la app no tiene servidor?**
Requisito del proyecto. Se resolvió con HTML/CSS/JS, `file://`, IndexedDB y
Chart.js vendoreado. Limitación: hay que abrir el JSON la primera vez por CORS.

**¿Por qué IDs aleatorios?**
Para no filtrar estructura artificial; los datasets reales usan identificadores
arbitrarios (`CONS_NO`). Así el modelo no "aprende" del orden.

**¿Qué mejorarían con más tiempo?**
Datos reales, modelos secuenciales, atribución a nivel de medidor dentro del
transformador, umbral costo-óptimo, active learning y explicabilidad (SHAP).

---

## 6. Limitaciones a declarar proactivamente

Decirlas **antes** de que las pregunten da credibilidad:

1. Datos sintéticos: no hay validez de campo.
2. Muestra pequeña (100 medidores).
3. Sin validación temporal real ni drift.
4. Umbral fijo (no costo-óptimo).
5. Sin topología fina (fase, aguas abajo).
6. La evaluación usa etiquetas del generador, no de inspecciones.

---

## 7. Frases de cierre

- "El sistema no acusa: **prioriza inspecciones** con evidencia."
- "El valor no está en el 88 % de accuracy, sino en **concentrar fraudes en las
  primeras inspecciones**."
- "Es un **banco de pruebas reproducible** de una arquitectura real, no un
  producto en producción."
