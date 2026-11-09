# Observatorio energético

Proyecto de **Inteligencia Artificial Aplicada**.

## 1. Instalar los requisitos

| Sistema | Instalación |
|---|---|
| Windows | [Docker Desktop](https://docs.docker.com/desktop/setup/install/windows-install/) con WSL 2 y contenedores Linux. Incluye Compose. |
| Linux (Ubuntu) | [Docker Engine y plugin Docker Compose](https://docs.docker.com/engine/install/ubuntu/). |
| Debian | [Docker Engine y plugin Docker Compose](https://docs.docker.com/engine/install/debian/). |
| macOS | [Docker Desktop](https://docs.docker.com/desktop/setup/install/mac-install/), para Apple silicon o Intel. Incluye Compose. |

Iniciar Docker y comprobar:

~~~sh
docker version
docker compose version
~~~

Docker debe mostrar **Client y Server**. No hace falta instalar Python ni Node.js.

## 2. Descargar el repositorio

Con [Git instalado](https://git-scm.com/install/):

~~~sh
git clone https://github.com/mateoschreiber/ia_2026.git
cd ia_2026
~~~

Si ya está descargado, abrir una terminal en la carpeta que contiene `docker-compose.yml`.

## 3. Ejecutar todo con un comando

~~~sh
docker compose up --build -d
~~~

Esperar el inicio y abrir **http://localhost:8000**.

El comando construye la interfaz, prepara la API e inicializa los datos y modelos. La primera ejecución requiere internet. Usar la URL; no abrir el `index.html` de la raíz.

## Comandos básicos

| Acción | Comando |
|---|---|
| Ver estado | `docker compose ps` |
| Ver logs | `docker compose logs -f energia` |
| Detener sin borrar datos | `docker compose down` |
| Volver a iniciar | `docker compose up -d` |

En Linux/Debian, anteponer `sudo` si el usuario no tiene permisos para Docker.
