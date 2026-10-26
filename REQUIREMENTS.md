# Requisitos del proyecto

Aplicación **100 % estática** (HTML + CSS + JavaScript) para el Proyecto Final
de Inteligencia Artificial. Este documento describe qué se necesita para
**usarla**, **reproducir los datos** y **probar el motor de análisis**.

---

## 1. Para usar la aplicación (runtime)

- Un navegador web moderno: **Chrome / Edge** (recomendado) o Firefox.
- **Nada más.** Sin servidor, sin base de datos externa, sin build, sin
  dependencias de red en tiempo de ejecución.

Cómo abrir:

1. Doble clic en `index.html`.
2. En **Inicio** → "Abrir base de datos" → seleccionar `data/database.json`
   (o arrastrarlo a la ventana). Solo hace falta la primera vez; después queda
   cacheado en **IndexedDB**.

> En Chrome/Edge, "Guardar" escribe de vuelta al `.json` (File System Access
> API); en otros navegadores descarga una copia.

---

## 2. Para regenerar los datos emulados (opcional)

- **Python 3.9+**

```sh
python3 generator/generate.py
```

Produce `data/database.json` (100 medidores × 8760 h, determinista, semilla 42).

---

## 3. Para probar el motor de análisis (opcional, solo desarrollo)

- **Node.js 20+**

```sh
node test/run-tests.js
```

Ejecuta Isolation Forest + autoencoder + pronóstico + balance sobre el dataset,
valida el resultado contra el esquema y reporta `precision@k` / `recall`.

---

## 4. Herramientas instaladas en este entorno (sin `sudo`)

Como el sistema no expone privilegios de administrador, las herramientas se
instalaron en el espacio del usuario (`~/.local/bin`), desde sus binarios
oficiales:

| Herramienta | Versión | Ruta | Uso |
|---|---|---|---|
| Node.js | v20.20.2 | `~/.local/bin/node` | pruebas del motor (`test/run-tests.js`) |
| GitHub CLI (`gh`) | v2.103.3 | `~/.local/bin/gh` | subir código al repositorio |

Para usarlas en una terminal nueva, asegurarse de que `~/.local/bin` esté en el
`PATH` (añadir a `~/.bashrc` si no lo está).

---

## 5. Repositorio y publicación

- Repositorio: <https://github.com/mateoschreiber/ia_2026> (rama `main`).
- Autenticación con GitHub CLI (una vez):

```sh
gh auth login          # flujo por navegador (código de dispositivo)
gh auth setup-git      # configura git para usar gh como credential helper
```

- Publicar cambios:

```sh
git add -A
git commit -m "descripción"
git push origin main
```
