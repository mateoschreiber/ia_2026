#!/usr/bin/env python3
"""Generador de datos emulados (F1/F2).

Produce `data/database.json` con:
  - 5 zonas, 20 transformadores, 100 medidores.
  - 1 año horario (8760 h) de lecturas por medidor + clima horario.
  - Etiquetas de pérdida no técnica (ground truth) con 7 arquetipos.

Cambios de la F2:
  - IDs aleatorios alfanuméricos (sin prefijo secuencial), como los
    `CONS_NO` de los datasets reales (SGCC), para no filtrar estructura.
  - Más heterogeneidad por medidor (jitter en el perfil y en la
    sensibilidad térmica) para un análisis más realista.

Es determinista (semilla fija) y reproducible:

    python3 generator/generate.py

Este script es una herramienta de desarrollo (no forma parte de la app, que
sigue siendo 100 % HTML/CSS/JS sin servidor).
"""
import json
import math
import os
import random
from datetime import datetime, timedelta

SEED = 42
HOURS = 8760
INTERVAL_H = 1
START = datetime(2025, 1, 1, 0, 0)
OUT = "data/database.json"

# Alfabeto sin caracteres ambiguos (0/O, 1/I/L).
ID_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"

rng = random.Random(SEED)


def fmt(ts):
    return ts.strftime("%Y-%m-%dT%H:%M:%S")


def random_id(r, length=8):
    return "".join(r.choice(ID_ALPHABET) for _ in range(length))


def unique_ids(r, n, length=8):
    seen = set()
    out = []
    while len(out) < n:
        c = random_id(r, length)
        if c not in seen:
            seen.add(c)
            out.append(c)
    return out


# ---------------------------------------------------------------- topología
ZONES = [
    ("Centro", "Comercial y residencial denso"),
    ("Villa Morra", "Piloto AMI, alta carga de aire acondicionado"),
    ("Lambaré", "Residencial medio"),
    ("Fernando de la Mora", "Mixto residencial/comercial"),
    ("Luque", "Residencial e industrial liviano"),
]
N_TRANSFORMERS = 20
N_METERS = 100

# Parámetros por tipo de cliente
TYPE_PARAMS = {
    "residencial": {"base": (0.30, 0.80), "thermal": 0.006, "tariff": "T1", "cap": (5, 12)},
    "comercial":   {"base": (1.00, 2.20), "thermal": 0.004, "tariff": "T2", "cap": (15, 30)},
    "industrial":  {"base": (2.50, 5.50), "thermal": 0.001, "tariff": "T3", "cap": (30, 50)},
}

ARCHETYPES = [
    "bypass_total",
    "bypass_parcial",
    "inversion_fase",
    "manipulacion_nocturna",
    "conexion_directa",
    "fraude_intermitente",
    "medidor_defectuoso",
]


def build_topology():
    zone_ids = unique_ids(rng, len(ZONES))
    zones = [
        {"id": zone_ids[i], "name": z[0], "description": z[1]}
        for i, z in enumerate(ZONES)
    ]

    trafo_ids = unique_ids(rng, N_TRANSFORMERS)
    transformers = []
    for i in range(N_TRANSFORMERS):
        zone = zones[i % len(zones)]
        transformers.append({
            "id": trafo_ids[i],
            "zoneId": zone["id"],
            "name": "TR %s %d" % (zone["name"], i + 1),
            "capacityKva": 0.0,  # se asigna según el pico de su carga (al final)
            "energySuppliedKwh": 0.0,  # se completa al final
        })

    meter_ids = unique_ids(rng, N_METERS)
    meters = []
    for i in range(N_METERS):
        t = transformers[i % N_TRANSFORMERS]
        r = rng.random()
        if r < 0.75:
            ctype = "residencial"
        elif r < 0.95:
            ctype = "comercial"
        else:
            ctype = "industrial"
        p = TYPE_PARAMS[ctype]
        meters.append({
            "id": meter_ids[i],
            "transformerId": t["id"],
            "customerType": ctype,
            "tariff": p["tariff"],
            "capacityContractedKw": round(rng.uniform(*p["cap"]), 2),
            "active": True,
        })
    return zones, transformers, meters


# ------------------------------------------------------------------ clima
def gen_weather():
    heat_waves = []
    for _ in range(4):
        if rng.random() < 0.5:
            day = rng.randint(0, 58)
        else:
            day = rng.randint(334, 364)
        heat_waves.append((day, rng.randint(3, 6)))

    tempC = []
    humidity = []
    prev_noise = 0.0
    for h in range(HOURS):
        ts = START + timedelta(hours=h)
        doy = ts.timetuple().tm_yday - 1
        hour = ts.hour
        seasonal = 23 + 8 * math.cos(2 * math.pi * (doy - 15) / 365.0)
        daily = 5 * math.sin(2 * math.pi * (hour - 9) / 24.0)
        extra = 0.0
        for (d, dur) in heat_waves:
            if d <= doy < d + dur:
                mid = d + dur / 2.0
                extra = 5.0 * math.exp(-((doy - mid) ** 2) / (2 * (dur / 2.0) ** 2))
        noise = 0.6 * prev_noise + rng.gauss(0, 0.8)
        prev_noise = noise
        tval = seasonal + daily + extra + noise
        tempC.append(round(tval, 2))
        hum = 78 - 0.6 * (tval - 23) + rng.gauss(0, 3)
        humidity.append(round(min(100.0, max(30.0, hum)), 1))
    return tempC, humidity


# ------------------------------------------------------------- consumo real
def daily_profile(ctype):
    prof = [0.5] * 24
    if ctype == "residencial":
        for h in range(24):
            if 6 <= h <= 9:
                prof[h] = 1.1
            elif 18 <= h <= 22:
                prof[h] = 1.5
            elif h < 5:
                prof[h] = 0.55
    elif ctype == "comercial":
        for h in range(24):
            if 8 <= h <= 20:
                prof[h] = 1.4
            elif 12 <= h <= 14:
                prof[h] = 1.2
            elif h < 7:
                prof[h] = 0.4
    else:  # industrial
        for h in range(24):
            if 6 <= h <= 18:
                prof[h] = 1.15
            elif h < 5:
                prof[h] = 0.85
    return prof


def seasonal_factor(doy):
    return 1.0 + 0.25 * math.cos(2 * math.pi * (doy - 15) / 365.0)


def thermal_response(temp, sensitivity, threshold=25.0):
    if temp <= threshold:
        return 1.0
    return 1.0 + sensitivity * (temp - threshold) ** 2


def gen_true_series(meter, base, sensitivity, tempC, profile_scale):
    prof = daily_profile(meter["customerType"])
    series = []
    prev = 0.0
    for h in range(HOURS):
        ts = START + timedelta(hours=h)
        doy = ts.timetuple().tm_yday - 1
        hour = ts.hour
        v = base * prof[hour] * profile_scale * seasonal_factor(doy) * thermal_response(tempC[h], sensitivity)
        noise = 0.7 * prev + rng.gauss(0, 0.06)
        prev = noise
        v *= (1 + noise)
        series.append(max(0.0, v))
    return series


# --------------------------------------------------------------- fraude
def apply_fraud(archetype, true):
    n = len(true)
    recorded = list(true)
    if archetype == "bypass_total":
        recorded = [0.02 + 0.005 * abs(rng.gauss(0, 1)) for _ in range(n)]
    elif archetype == "bypass_parcial":
        f = rng.uniform(0.50, 0.65)
        recorded = [v * f for v in true]
    elif archetype == "inversion_fase":
        mean_v = sum(true) / n
        recorded = [mean_v * 0.7 + rng.gauss(0, mean_v * 0.02) for _ in range(n)]
    elif archetype == "manipulacion_nocturna":
        f = rng.uniform(0.20, 0.35)
        for h in range(n):
            if h % 24 < 6:
                recorded[h] = true[h] * f
    elif archetype == "conexion_directa":
        recorded = [v * 0.35 for v in true]
    elif archetype == "fraude_intermitente":
        f = rng.uniform(0.25, 0.40)
        day = -1
        for h in range(n):
            d = h // 24
            hour = h % 24
            if d != day:
                day = d
                active = rng.random() < 0.12
                start_hour = rng.randint(17, 20)
            if active and start_hour <= hour < start_hour + 4:
                recorded[h] = true[h] * f
    elif archetype == "medidor_defectuoso":
        cur = rng.uniform(0.55, 0.90)
        drift = rng.uniform(-0.001, 0.001)
        for h in range(n):
            cur = min(0.98, max(0.40, cur + drift + rng.gauss(0, 0.005)))
            recorded[h] = true[h] * cur
    return [max(0.0, v) for v in recorded]


# ------------------------------------------------------------- capacidad
def assign_capacities(transformers, meters, readings):
    """Dimensiona cada transformador según su pico de carga registrado.
    La mayoría quedan holgados; unos pocos quedan subdimensionados para
    que la detección de sobrecarga sea realista (kVA ≈ kW, fp ≈ 1)."""
    meter_trafo = {m["id"]: m["transformerId"] for m in meters}
    agg = {t["id"]: [0.0] * HOURS for t in transformers}
    for r in readings:
        tid = meter_trafo.get(r["meterId"])
        if tid is None:
            continue
        a = agg[tid]
        kwh = r["kwh"]
        for h in range(HOURS):
            a[h] += kwh[h]

    idxs = list(range(N_TRANSFORMERS))
    overloaded = set(rng.sample(idxs, 3))
    near = set(rng.sample([i for i in idxs if i not in overloaded], 2))
    for idx, t in enumerate(transformers):
        pk = max(agg[t["id"]]) if agg[t["id"]] else 0.0
        if pk <= 0:
            pk = 1.0
        if idx in overloaded:
            cap = pk * rng.uniform(0.60, 0.85)   # sobrecargado (ratio > 1)
        elif idx in near:
            cap = pk * rng.uniform(0.95, 1.05)   # cerca del límite
        else:
            cap = pk * rng.uniform(1.40, 1.90)   # holgado
        t["capacityKva"] = round(cap, 1)


# ------------------------------------------------------------------ main
def main():
    zones, transformers, meters = build_topology()
    tempC, humidity = gen_weather()

    fraud_idx = sorted(rng.sample(range(N_METERS), len(ARCHETYPES)))
    label_ids = unique_ids(rng, N_METERS)

    readings = []
    labels = []
    true_sum_by_meter = {}
    recorded_sum_by_meter = {}

    for i, meter in enumerate(meters):
        p = TYPE_PARAMS[meter["customerType"]]
        base = rng.uniform(*p["base"])
        sensitivity = p["thermal"] * rng.uniform(0.6, 1.4)   # jitter por medidor
        profile_scale = rng.uniform(0.9, 1.1)                # jitter por medidor
        true = gen_true_series(meter, base, sensitivity, tempC, profile_scale)

        archetype = None
        if i in fraud_idx:
            archetype = ARCHETYPES[fraud_idx.index(i)]
            recorded = apply_fraud(archetype, true)
        else:
            recorded = true

        rounded = [round(v, 2) for v in recorded]
        readings.append({
            "meterId": meter["id"],
            "start": fmt(START),
            "intervalH": INTERVAL_H,
            "kwh": rounded,
        })

        true_sum_by_meter[meter["id"]] = sum(true)
        recorded_sum_by_meter[meter["id"]] = sum(rounded)

        labels.append({
            "id": label_ids[i],
            "meterId": meter["id"],
            "isFraud": archetype is not None,
            "archetype": archetype,
            "note": "Pérdida no técnica simulada: %s" % archetype if archetype else None,
        })

    for t in transformers:
        tech = rng.uniform(0.04, 0.07)
        total_true = 0.0
        for m in meters:
            if m["transformerId"] == t["id"]:
                total_true += true_sum_by_meter[m["id"]]
        t["energySuppliedKwh"] = round(total_true * (1 + tech), 2)

    assign_capacities(transformers, meters, readings)

    fraud_meters = [meters[i]["id"] for i in fraud_idx]
    dataset = {
        "schemaVersion": 1,
        "meta": {
            "generatedAt": fmt(datetime(2025, 12, 31, 23, 0)),
            "seed": SEED,
            "intervalH": INTERVAL_H,
            "period": {"start": fmt(START), "hours": HOURS},
            "note": "Datos emulados con fines educativos (F2). IDs alfanuméricos "
                    "aleatorios (sin prefijo secuencial). 100 medidores x 8760 h.",
            "fraudCount": len(fraud_idx),
            "fraudMeters": fraud_meters,
            "fraudArchetypes": ARCHETYPES,
        },
        "zones": zones,
        "transformers": transformers,
        "meters": meters,
        "readings": readings,
        "weather": {
            "start": fmt(START),
            "intervalH": INTERVAL_H,
            "tempC": tempC,
            "humidity": humidity,
        },
        "labels": labels,
        "detections": [],
        "forecast": [],
        "alerts": [],
    }

    with open(OUT, "w", encoding="utf-8") as f:
        json.dump(dataset, f, ensure_ascii=False, separators=(",", ":"), indent=2)

    size_mb = os.path.getsize(OUT) / 1e6
    print("OK  %s" % OUT)
    print("    medidores: %d | transformadores: %d | zonas: %d" % (N_METERS, N_TRANSFORMERS, len(zones)))
    print("    lecturas: %d series x %d h" % (len(readings), HOURS))
    print("    fraude: %d medidores -> %s" % (len(fraud_idx), fraud_meters))
    print("    tamaño: %.2f MB (bytes)" % size_mb)


if __name__ == "__main__":
    main()
