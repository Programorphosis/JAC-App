# Despliegue con imágenes pre-construidas

Construir las imágenes en local (o CI) y desplegar en el servidor **sin hacer build** en el VPS. Ideal para Lightsail con 2GB RAM.

---

## 1. Crear cuenta en Docker Hub

1. Entra en https://hub.docker.com
2. Clic en **Sign Up** y crea una cuenta (o inicia sesión si ya tienes)
3. Anota tu **username** (ej. `gdmp9`) — lo usarás en los pasos siguientes
4. No hace falta crear repositorios manualmente; el script subirá las imágenes con tu username como prefijo

**En tu PC (PowerShell), haz login una vez:**

```powershell
docker login
```

Te pedirá username y contraseña. Si todo va bien verás: `Login Succeeded`.

---

## 2. Añadir variable en .env.production

Abre el archivo `.env.production` que tienes en la raíz del proyecto (junto a `docker-compose.yml`).

Añade esta línea (o modifícala si ya existe):

```
# Usuario de Docker Hub — sustituye por tu username real
DOCKER_IMAGE_PREFIX=gdmp9
```

Sustituye `gdmp9` por tu usuario de Docker Hub. Este valor se usa tanto en tu PC (para etiquetar las imágenes) como en el servidor (para saber de dónde descargarlas).

---

## 3. Build y push desde tu PC (Windows)

Abre **PowerShell** (no CMD) y ejecuta:

```powershell
cd "c:\Users\gdmp9\Desktop\JAC App"
```

Luego:

```powershell
$env:DOCKER_IMAGE_PREFIX = "gdmp9"
```

(Sustituye `gdmp9` por tu usuario.)

Y finalmente:

```powershell
.\scripts\build-and-push.ps1
```

**Qué hace el script:**
1. Construye la imagen del backend (NestJS)
2. Construye la imagen del frontend (Angular)
3. Las sube a Docker Hub con tu username

La primera vez puede tardar 5–15 minutos (descarga dependencias de npm). Las siguientes son más rápidas por caché.

Si todo va bien, al final verás un mensaje indicando los comandos a ejecutar en el servidor.

---

## 4. En el servidor (Ubuntu / Lightsail)

Todo lo que sigue se ejecuta **dentro del servidor**, conectado por SSH. Si no sabes cómo conectar, ver `docs/PASO_A_PASO_LIGHTSAIL.md` Partes 1–3.

---

### 4.1 — Conectarte al servidor por SSH

**Desde tu PC (PowerShell):**

```powershell
ssh -i "C:\ruta\a\tu-clave.pem" ubuntu@TU_IP_LIGHTSAIL
```

- `C:\ruta\a\tu-clave.pem` → ruta real donde guardaste la clave que descargaste de Lightsail (pestaña Account → Download default key).
- `TU_IP_LIGHTSAIL` → la IP estática de tu instancia (ej. `3.239.xxx.xxx`).

Ejemplo real:
```powershell
ssh -i "C:\Users\gdmp9\Downloads\LightsailDefaultKey-us-east-1.pem" ubuntu@3.239.123.45
```

Cuando te pida algo, escribe `yes` la primera vez. Luego verás un prompt como `ubuntu@ip-172-26-6-28:~$`. Eso significa que ya estás dentro del servidor.

---

### 4.2 — Verificar que Docker está instalado

Escribe:

```bash
docker --version
```

Debe salir algo como `Docker version 24.x.x`. Si no, instala Docker siguiendo `docs/PASO_A_PASO_LIGHTSAIL.md` Parte 4.

---

### 4.3 — Ir a la carpeta del proyecto

```bash
cd ~/JAC-App
```

`~` es la carpeta de tu usuario (`/home/ubuntu`). Si clonaste el repo con otro nombre (ej. `jac-app`), usa ese:

```bash
cd ~/jac-app
```

Para ver qué carpetas hay:

```bash
ls -la
```

Debes ver archivos como `docker-compose.yml`, `docker-compose.prod.yml`, `Caddyfile`, carpetas `apps/`, `docs/`, etc.

---

### 4.4 — Tener el archivo `.env.production` en el servidor

Este archivo contiene las variables de entorno (base de datos, JWT, dominio, etc.). **No está en Git** por seguridad.

**Opción A — Copiarlo desde tu PC con SCP**

En tu PC, en **otra ventana de PowerShell** (no la SSH), ejecuta:

```powershell
scp -i "C:\ruta\a\tu-clave.pem" "C:\Users\gdmp9\Desktop\JAC App\.env.production" ubuntu@TU_IP_LIGHTSAIL:/home/ubuntu/JAC-App/
```

Sustituye las rutas y la IP. Si tu carpeta en el servidor es `jac-app` (minúsculas), cambia el final a `/home/ubuntu/jac-app/`.

**Opción B — Crearlo manualmente en el servidor**

En el servidor:

```bash
nano .env.production
```

Se abre un editor. Pega todo el contenido de tu `.env.production` local. Para guardar: `Ctrl+O`, Enter, luego `Ctrl+X` para salir.

**Importante:** dentro de `.env.production` debe estar esta línea (con tu usuario de Docker Hub):

```
DOCKER_IMAGE_PREFIX=gdmp9
```

Proteger el archivo:

```bash
chmod 600 .env.production
```

---

### 4.5 — Hacer login en Docker Hub (solo la primera vez)

Las imágenes están en Docker Hub. El servidor necesita permiso para descargarlas.

```bash
docker login
```

Te pedirá:
- **Username:** tu usuario de Docker Hub (ej. `gdmp9`)
- **Password:** tu contraseña (o un Access Token si usas 2FA)

Si todo va bien verás: `Login Succeeded`.

---

### 4.6 — Descargar las imágenes (pull)

Esto descarga las imágenes que construiste en tu PC desde Docker Hub al servidor. **No compila nada.**

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production pull
```

Qué hace cada parte:
- `docker compose` → usa Docker Compose
- `-f docker-compose.yml` → usa el archivo principal
- `-f docker-compose.prod.yml` → añade el override que usa imágenes en lugar de build
- `--env-file .env.production` → carga las variables (incluida `DOCKER_IMAGE_PREFIX`)
- `pull` → descarga las imágenes

Verás líneas como:
```
[+] Pulling 2/2
 ✔ backend  Pulled
 ✔ frontend Pulled
```

Puede tardar 1–3 minutos según la conexión.

---

### 4.7 — Levantar los contenedores (up)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d
```

- `up` → crea e inicia los contenedores
- `-d` → en segundo plano (detached)

Verás algo como:
```
[+] Running 5/5
 ✔ Container jac-postgres  Started
 ✔ Container jac-backend   Started
 ✔ Container jac-frontend  Started
 ✔ Container jac-caddy     Started
```

---

### 4.8 — Comprobar que todo está corriendo

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production ps
```

Debes ver todos los contenedores con estado `Up` o `running`. Si alguno dice `Exit` o `Restarting`, algo falló.

Para ver logs del backend:

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production logs backend
```

`Ctrl+C` para salir de los logs.

---

### 4.9 — Ejecutar el seed (solo la primera vez)

El seed crea usuarios de prueba, una junta demo, tarifas, etc. **Solo se hace una vez** al desplegar por primera vez.

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend node dist/prisma/seed-dev.js
```
Platform Admin (juntaId: platform):
    Documento: 00000000
    Password:  DevPlatform123!

  Admin Junta (primera junta):
    Documento: 12345678
    Password:  DevAdmin123!


- `exec` → ejecuta un comando dentro de un contenedor que ya está corriendo
- `backend` → el contenedor del backend
- `node dist/prisma/seed-dev.js` → el script de seed

Al terminar verás algo como:
```
Datos de demo agregados a la junta.
=== Seed de desarrollo completado ===
Credenciales para Postman:
  Platform Admin: Documento 00000000, Password: DevPlatform123!
  Admin Junta: Documento 12345678, Password: DevAdmin123!
```

---

### 4.10 — Probar que la app responde

Desde tu PC, abre el navegador y entra a:

**https://jacapp.online**

Si el DNS ya apunta al servidor, deberías ver la app. Si no carga o da error de certificado, espera 10–15 minutos a que el DNS propague y Caddy obtenga el certificado SSL.

Para probar el backend desde el servidor:

```bash
curl http://localhost:3000/api/health/ready
```

Debe responder algo como: `{"status":"ok","database":"connected"}`.

---

### 4.11 — Actualizaciones (cuando cambies código)

Cuando hagas cambios en el código y quieras desplegar la nueva versión:

**1. En tu PC:** construye y sube de nuevo:

```powershell
cd "c:\Users\gdmp9\Desktop\JAC App"
$env:DOCKER_IMAGE_PREFIX = "programorphosis92"
.\scripts\build-and-push.ps1
```

**2. En el servidor:** actualiza el código y las imágenes:

```bash
cd ~/JAC-App
git pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d
```

- `git pull` → trae los últimos cambios (docker-compose.prod.yml, Caddyfile, etc.)
- `pull` → descarga las nuevas imágenes
- `up -d` → reinicia los contenedores con las nuevas imágenes

**No vuelvas a ejecutar el seed** en actualizaciones; solo la primera vez.

---

### 4.12 — Si algo falla

**Error "no such image" o "pull access denied":**
- Comprueba que `DOCKER_IMAGE_PREFIX` en `.env.production` sea correcto.
- Comprueba que hiciste `docker login` en el servidor.
- Comprueba que las imágenes existen en Docker Hub (entra a hub.docker.com y revisa tu perfil).

**Contenedor en "Exit" o "Restarting":**
- `docker compose -f docker-compose.yml -f docker-compose.prod.yml logs backend` (o el que falle)
- Revisa que `.env.production` tenga todas las variables necesarias (DB_PASSWORD, JWT_SECRET, etc.).

**No carga https://jacapp.online:**
- Comprueba que el DNS del dominio apunte a la IP del servidor.
- Comprueba que los puertos 80 y 443 estén abiertos en el firewall de Lightsail (pestaña Networking).

---

## Resumen de comandos (orden de ejecución)

| Paso | Dónde | Comando |
|------|-------|---------|
| 1 | **PC** | `docker login` (solo primera vez) |
| 2 | **PC** | `$env:DOCKER_IMAGE_PREFIX="gdmp9"; .\scripts\build-and-push.ps1` |
| 3 | **Servidor** | `cd ~/JAC-App` |
| 4 | **Servidor** | `docker login` (solo primera vez) |
| 5 | **Servidor** | `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production pull` |
| 6 | **Servidor** | `docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d` |
| 7 | **Servidor** | `docker compose -f docker-compose.yml -f docker-compose.prod.yml exec backend node dist/prisma/seed-dev.js` (solo primera vez) |

---

## GitHub Container Registry (alternativa)

Si prefieres usar GHCR en lugar de Docker Hub:

1. Crear un Personal Access Token con `write:packages`
2. Login: `echo $GITHUB_TOKEN | docker login ghcr.io -u USERNAME --password-stdin`
3. Usar `DOCKER_IMAGE_PREFIX=ghcr.io/tuorg/jac-app` (o tu usuario)
4. Los scripts funcionan igual; solo cambia el prefijo
