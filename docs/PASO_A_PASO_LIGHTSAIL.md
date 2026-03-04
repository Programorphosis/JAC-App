# Paso a paso: Desplegar JAC App en AWS Lightsail

Guía detallada para crear la instancia, configurar el servidor y arrancar el proyecto.

---

## Antes de empezar

- [ ] Cuenta en AWS
- [ ] Dominio `jacapp.online` (ya lo tienes en Hostinger)
- [ ] Repositorio Git del proyecto (local o GitHub)
- [ ] `.env.production` preparado con los valores necesarios
- [ ] **Recomendado:** Build en local y deploy con imágenes (ver `docs/DEPLOY_IMAGENES.md`) — evita build pesado en servidor 2GB

---

## Parte 1: Crear la instancia en Lightsail

### Paso 1.1 — Entrar a Lightsail

1. Ve a https://lightsail.aws.amazon.com
2. Inicia sesión con tu cuenta AWS
3. Si es tu primera vez, elige una región (ej. **us-east-1**)

### Paso 1.2 — Crear instancia

1. Clic en **Create instance**
2. **Ubicación:** misma región que tus buckets S3 (ej. **Virginia**, us-east-1)
3. **Plataforma:** Linux/Unix
4. **Blueprint:** **OS Only** → **Ubuntu 22.04 LTS**
5. **Plan:** mínimo **$10/mes** (1 GB RAM, 1 vCPU) — recomendado **$20/mes** (2 GB RAM) para producción
6. **Nombre:** `jac-app-prod` (o el que prefieras)
7. Clic en **Create instance**

### Paso 1.3 — Anotar la IP estática

1. Espera a que la instancia esté en estado **Running**
2. En la pestaña **Networking**, clic en **Create static IP**
3. Nombre: `jac-app-ip`
4. Adjuntar a la instancia que creaste
5. **Create**
6. **Anota la IP pública** (ej. `3.239.xxx.xxx`) — la usarás para el DNS

---

## Parte 2: Configurar DNS (Hostinger)

### Paso 2.1 — Apuntar el dominio a la IP

1. Entra a Hostinger → tu dominio `jacapp.online` → **DNS / Nameservers**
2. Edita o crea el registro **A**:
   - **Nombre:** `@` (o vacío, según el panel)
   - **Valor / Apunta a:** la IP de Lightsail (ej. `3.239.xxx.xxx`)
   - **TTL:** 300 o 3600
3. Guarda los cambios
4. La propagación puede tardar 5–60 minutos

---

## Parte 3: Conectar por SSH

### Paso 3.1 — Descargar la clave SSH (primera vez)

1. En Lightsail → tu instancia → pestaña **Account**
2. Clic en **Download default key** (o usa una clave propia)
3. Guarda el archivo `.pem` en un lugar seguro (ej. `~/Downloads/jac-app-key.pem`)

### Paso 3.2 — Conectar desde tu PC

**Windows (PowerShell o CMD):**
```powershell
ssh -i "C:\ruta\a\jac-app-key.pem" ubuntu@TU_IP_LIGHTSAIL
```

**Mac/Linux:**
```bash
chmod 400 ~/Downloads/jac-app-key.pem
ssh -i ~/Downloads/jac-app-key.pem ubuntu@TU_IP_LIGHTSAIL
```

Sustituye `TU_IP_LIGHTSAIL` por la IP estática que anotaste.

### Paso 3.3 — Alternativa: SSH desde el navegador

1. En Lightsail → tu instancia → **Connect using SSH**
2. Se abre una terminal en el navegador (no necesitas la clave local)

---

## Parte 4: Instalar Docker y dependencias

Ejecuta estos comandos **dentro del servidor** (por SSH):

### Paso 4.1 — Actualizar el sistema

```bash
sudo apt update && sudo apt upgrade -y
```

### Paso 4.2 — Instalar Docker

```bash
# Instalar dependencias
sudo apt install -y ca-certificates curl gnupg lsb-release

# Añadir clave GPG de Docker
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg

# Añadir repositorio
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null

# Instalar Docker
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin

# Verificar
docker --version
docker compose version
```

### Paso 4.3 — Permitir que tu usuario use Docker (sin sudo)

```bash
sudo usermod -aG docker ubuntu
```

**Importante:** Cierra la sesión SSH y vuelve a conectar para que el cambio tenga efecto. O ejecuta `newgrp docker`.

### Paso 4.4 — Instalar Git

```bash
sudo apt install -y git
git --version
```

### Paso 4.5 — Instalar AWS CLI v2 (para backups a S3)

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip
sudo ./aws/install
rm -rf aws awscliv2.zip
aws --version
```

### Paso 4.6 — Configurar AWS CLI (credenciales)

```bash
aws configure
```

Introduce cuando te lo pida:
- **AWS Access Key ID:** tu `AWS_ACCESS_KEY_ID`
- **AWS Secret Access Key:** tu `AWS_SECRET_ACCESS_KEY`
- **Default region:** `us-east-1` (o la que uses)
- **Default output format:** `json`

---

## Parte 5: Configurar el firewall

Lightsail tiene un firewall en la pestaña **Networking**. Asegúrate de tener:

| Puerto | Protocolo | Origen |
|--------|-----------|--------|
| 22 | TCP | Tu IP (recomendado) o 0.0.0.0/0 |
| 80 | TCP | 0.0.0.0/0 |
| 443 | TCP | 0.0.0.0/0 |

Si falta alguno, añádelo con **Add rule**.

---

## Parte 6: Subir el código y configurar

### Paso 6.1 — Clonar el repositorio

**Opción A: Si el repo está en GitHub (público o con acceso):**
```bash
cd ~
git clone https://github.com/TU_USUARIO/TU_REPO.git jac-app
cd jac-app
```

**Opción B: Subir desde tu PC con SCP**

En tu PC (PowerShell, reemplaza rutas y IP):
```powershell
scp -i "C:\ruta\a\jac-app-key.pem" -r "C:\Users\gdmp9\Desktop\JAC App\*" ubuntu@TU_IP:/home/ubuntu/jac-app/
```

Luego en el servidor:
```bash
cd ~/jac-app
```

### Paso 6.2 — Crear `.env.production` en el servidor

```bash
cd ~/jac-app
nano .env.production
```

Pega el contenido de tu `.env.production` local. O cópialo con SCP:

```powershell
# Desde tu PC (el .env.production no debe estar en git)
scp -i "ruta\a\jac-app-key.pem" "C:\Users\gdmp9\Desktop\JAC App\.env.production" ubuntu@TU_IP:/home/ubuntu/jac-app/
```

**Verificar que `DOMAIN=jacapp.online`** y que las variables sensibles estén completas.

### Paso 6.3 — Proteger el archivo

```bash
chmod 600 .env.production
```

---

## Parte 7: Levantar la aplicación

Hay dos formas de desplegar:

### Opción A — Con imágenes pre-construidas (recomendado para 2GB)

**En tu PC (antes):** construye y sube las imágenes a Docker Hub. Ver `docs/DEPLOY_IMAGENES.md`.

```powershell
# En tu PC Windows
$env:DOCKER_IMAGE_PREFIX = "tuusuario"  # tu usuario de Docker Hub
.\scripts\build-and-push.ps1
```

**En el servidor:** añade `DOCKER_IMAGE_PREFIX=tuusuario` a `.env.production`, luego:

```bash
cd ~/JAC-App
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml --env-file .env.production up -d
```

Tarda 1–2 minutos (solo descarga imágenes, no compila).

### Opción B — Build en el servidor

```bash
cd ~/JAC-App
docker compose --env-file .env.production up -d --build
```

La primera vez puede tardar 15–25 minutos (compila backend y frontend). Requiere 2GB+ RAM; con 1GB puede fallar.

### Paso 7.2 — Verificar que los contenedores están corriendo

```bash
docker compose ps
```

Debes ver: `postgres`, `backend`, `frontend`, `caddy` — todos en estado **Up**.

### Paso 7.3 — Ver logs si algo falla

```bash
docker compose logs -f
```

`Ctrl+C` para salir.

### Paso 7.4 — Comprobar health del backend

```bash
curl http://localhost:3000/api/health/ready
```

Debe responder algo como: `{"status":"ok","database":"connected"}`

### Paso 7.5 — Comprobar HTTPS (desde tu navegador)

Abre: **https://jacapp.online**

- Si el DNS ya propagó, Caddy habrá obtenido el certificado SSL y la app cargará.
- Si ves error de certificado o no carga, espera 10–15 minutos más a que el DNS propague y Caddy reintente.

---

## Parte 8: Ejecutar el bootstrap (primera vez)

El bootstrap crea el Platform Admin y la primera junta. **Solo se puede ejecutar una vez.**

### Paso 8.1 — Llamar al endpoint

Desde tu PC (PowerShell) o con Postman:

```powershell
$token = "TU_BOOTSTRAP_TOKEN"  # El valor de BOOTSTRAP_TOKEN en .env.production
$body = @{
    platformAdmin = @{
        nombres = "Admin"
        apellidos = "Plataforma"
        tipoDocumento = "CC"
        numeroDocumento = "00000000"
        password = "Cambiar123!"
    }
    primeraJunta = @{
        nombre = "Junta de Prueba"
        nit = "900000000"
        montoCarta = 3000
        adminUser = @{
            nombres = "Juan"
            apellidos = "Pérez"
            tipoDocumento = "CC"
            numeroDocumento = "12345678"
            telefono = "3001234567"
        }
    }
} | ConvertTo-Json -Depth 5

Invoke-RestMethod -Uri "https://jacapp.online/api/bootstrap" -Method Post -Headers @{"X-Bootstrap-Token"=$token; "Content-Type"="application/json"} -Body $body
```

**O con curl (desde el servidor o tu PC):**

```bash
curl -X POST https://jacapp.online/api/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Token: TU_BOOTSTRAP_TOKEN" \
  -d '{
    "platformAdmin": {
      "nombres": "Admin",
      "apellidos": "Plataforma",
      "tipoDocumento": "CC",
      "numeroDocumento": "00000000",
      "password": "Cambiar123!"
    },
    "primeraJunta": {
      "nombre": "Junta de Prueba",
      "nit": "900000000",
      "montoCarta": 3000,
      "adminUser": {
        "nombres": "Juan",
        "apellidos": "Pérez",
        "tipoDocumento": "CC",
        "numeroDocumento": "12345678",
        "telefono": "3001234567"
      }
    }
  }'
```

### Paso 8.2 — Guardar las credenciales

La respuesta incluye:
- **Platform Admin:** email y contraseña temporal
- **Admin de la primera junta:** email y contraseña temporal

Guárdalas en un lugar seguro. Usa el Platform Admin para acceder a `https://jacapp.online/platform`.

---

## Parte 9: Configurar backups automáticos

### Paso 9.1 — Verificar que AWS CLI tiene credenciales

El script de backup usa las variables de `.env.production`. Asegúrate de que `AWS_BACKUP_BUCKET` esté configurado y que el usuario IAM tenga permisos sobre ese bucket.

### Paso 9.2 — Probar backup manual

```bash
cd ~/jac-app
./scripts/backup-db.sh
```

Si hay error, revisa `AWS_BACKUP_BUCKET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` en `.env.production`.

### Paso 9.3 — Instalar cron para backup diario

```bash
./scripts/backup-db.sh --install-cron
```

Se ejecutará todos los días a las 2:00 AM.

---

## Parte 10: Verificación final

| Verificación | Comando / URL |
|--------------|---------------|
| App carga | https://jacapp.online |
| API health | https://jacapp.online/api/health/ready |
| Login Platform Admin | https://jacapp.online → Login con credenciales del bootstrap |
| Panel Platform | https://jacapp.online/platform |

---

## Resumen de comandos (referencia rápida)

```bash
# Conectar
ssh -i jac-app-key.pem ubuntu@TU_IP

# En el servidor
cd ~/jac-app
docker compose --env-file .env.production up -d --build
docker compose ps
docker compose logs -f

# Bootstrap (una sola vez, desde PC o servidor)
curl -X POST https://jacapp.online/api/bootstrap -H "Content-Type: application/json" -H "X-Bootstrap-Token: TOKEN" -d '{...}'

# Backup
./scripts/backup-db.sh
./scripts/backup-db.sh --install-cron
```

---

## Solución de problemas

**"Caddy no obtiene certificado"**
- Verifica que el DNS de `jacapp.online` apunte a la IP correcta: `nslookup jacapp.online`
- Espera 15–30 minutos a la propagación
- Revisa logs: `docker compose logs caddy`

**"Backend no arranca"**
- Revisa que `DATABASE_URL` y `DB_PASSWORD` sean correctos
- Logs: `docker compose logs backend`

**"502 Bad Gateway"**
- El backend o frontend no están listos. Espera 1–2 minutos y revisa `docker compose ps`
- Logs: `docker compose logs -f`

**"Bootstrap ya ejecutado"**
- Es normal. Solo se ejecuta una vez. Para crear más juntas usa el panel de Platform Admin.
