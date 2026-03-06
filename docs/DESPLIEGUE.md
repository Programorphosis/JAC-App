# Despliegue JAC App

Guía unificada para desplegar en producción (Lightsail, Docker Hub, Caddy). Combina el checklist rápido, imágenes pre-construidas, configuración de servidor y arquitectura.

---

## 1. Checklist rápido (actualizaciones)

Para desplegar cambios cuando el servidor ya está configurado:

| Paso | Dónde | Comando |
|------|-------|---------|
| 1 | PC | `cd "c:\Users\gdmp9\Desktop\JAC App"` |
| 2 | PC | `$env:DOCKER_IMAGE_PREFIX="tuusuario"; .\scripts\build-and-push.ps1` |
| 3 | Servidor | `cd ~/JAC-App` |
| 4 | Servidor | `git pull` |
| 5 | Servidor | `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml -f docker-compose.monitoring.yml --env-file .env.production pull` |
| 6 | Servidor | `docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml -f docker-compose.monitoring.yml --env-file .env.production up -d` |

**Notas:** `.env.production` está en `.gitignore`. El seed solo se ejecuta la primera vez. Sin monitoreo: quitar `-f docker-compose.monitoring.yml`.

---

## 2. Despliegue con imágenes pre-construidas

Construir en local y desplegar sin build en el servidor. Ideal para Lightsail 2GB.

### 2.1 Docker Hub

1. Cuenta en https://hub.docker.com
2. En PC: `docker login`
3. En `.env.production`: `DOCKER_IMAGE_PREFIX=tu-usuario`

### 2.2 Build y push (PC)

```powershell
cd "c:\Users\gdmp9\Desktop\JAC App"
$env:DOCKER_IMAGE_PREFIX = "tu-usuario"
.\scripts\build-and-push.ps1
```

### 2.3 En el servidor

**Con monitoreo** (Uptime Kuma, Prometheus, Grafana):

```bash
cd ~/JAC-App
docker login   # primera vez
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml -f docker-compose.monitoring.yml --env-file .env.production pull
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml -f docker-compose.monitoring.yml --env-file .env.production up -d
```

**Solo app** (sin monitoreo): quitar `-f docker-compose.monitoring.yml` de los comandos.

### 2.4 Seed (solo primera vez)

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml -f docker-compose.monitoring.yml exec backend npx prisma migrate reset --force
# O si usas seed-dev:
docker compose -f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml -f docker-compose.monitoring.yml exec backend node dist/prisma/seed-dev.js
```

---

## 3. Primer despliegue: Lightsail paso a paso

### 3.1 Crear instancia

1. https://lightsail.aws.amazon.com → Create instance
2. OS Only → Ubuntu 22.04 LTS
3. Plan: mínimo $20/mes (2 GB RAM)
4. Crear IP estática y anotar la IP

### 3.2 DNS (Hostinger u otro)

- Registro A: `@` → IP de Lightsail
- Con monitoreo: `monitor.tudominio` y `grafana.tudominio` → misma IP
- Propagación: 5–60 min

### 3.3 SSH

```powershell
ssh -i "ruta\a\tu-clave.pem" ubuntu@TU_IP
```

### 3.4 Instalar Docker, Git, AWS CLI

```bash
# Docker
sudo apt update && sudo apt upgrade -y
sudo apt install -y ca-certificates curl gnupg lsb-release
sudo mkdir -p /etc/apt/keyrings
curl -fsSL https://download.docker.com/linux/ubuntu/gpg | sudo gpg --dearmor -o /etc/apt/keyrings/docker.gpg
echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu $(lsb_release -cs) stable" | sudo tee /etc/apt/sources.list.d/docker.list > /dev/null
sudo apt update && sudo apt install -y docker-ce docker-ce-cli containerd.io docker-compose-plugin
sudo usermod -aG docker ubuntu
# Cerrar SSH y reconectar

# Git
sudo apt install -y git

# AWS CLI v2 (para backups)
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip -q awscliv2.zip && sudo ./aws/install && rm -rf aws awscliv2.zip
aws configure
```

### 3.5 Firewall

Puertos: 22 (SSH), 80 (HTTP), 443 (HTTPS). Con monitoreo: 3001 (Uptime Kuma), 3002 (Grafana) si accedes directo; si usas Caddy (monitor.*, grafana.*), basta 443.

### 3.6 Código y .env.production

```bash
cd ~
git clone https://github.com/TU_USUARIO/TU_REPO.git JAC-App
cd JAC-App
```

Copiar `.env.production` desde PC:

```powershell
scp -i "ruta\clave.pem" "C:\Users\gdmp9\Desktop\JAC App\.env.production" ubuntu@TU_IP:/home/ubuntu/JAC-App/
```

En servidor: `chmod 600 .env.production`

### 3.7 Bootstrap (primera vez)

```bash
curl -X POST https://jacapp.online/api/bootstrap \
  -H "Content-Type: application/json" \
  -H "X-Bootstrap-Token: TU_BOOTSTRAP_TOKEN" \
  -d '{
    "platformAdmin": {"nombres":"Admin","apellidos":"Plataforma","tipoDocumento":"CC","numeroDocumento":"00000000","password":"Cambiar123!"},
    "primeraJunta": {"nombre":"Junta de Prueba","nit":"900000000","montoCarta":3000,"adminUser":{"nombres":"Juan","apellidos":"Pérez","tipoDocumento":"CC","numeroDocumento":"12345678","telefono":"3001234567"}}
  }'
```

### 3.8 Backups automáticos

```bash
./scripts/backup-db.sh
./scripts/backup-db.sh --install-cron
```

---

## 4. Configurar .env.production

```bash
cp .env.production.example .env.production
nano .env.production
```

**Generar secretos:**
```bash
openssl rand -base64 64   # JWT_SECRET
openssl rand -base64 64   # JWT_REFRESH_SECRET
openssl rand -hex 32      # ENCRYPTION_MASTER_KEY
openssl rand -base64 32   # BOOTSTRAP_TOKEN
openssl rand -base64 24   # DB_PASSWORD
```

**Verificar:** `grep "<CAMBIAR\|<GENERAR" .env.production` → no debe devolver nada.

---

## 5. Arquitectura de red

```
Internet (HTTPS) → Caddy :80/:443 → nginx (frontend) :80 → NestJS (backend) :3000 → PostgreSQL :5432
```

- Caddy: SSL automático (Let's Encrypt)
- Nginx: SPA Angular + proxy /api → backend
- PostgreSQL: solo red interna

---

## 6. Backups

| Comando | Descripción |
|---------|-------------|
| `./scripts/backup-db.sh` | Backup manual |
| `./scripts/backup-db.sh --install-cron` | Cron diario 2:00 AM |
| `./scripts/restore-db.sh --list-s3` | Listar backups en S3 |
| `./scripts/restore-db.sh --from-s3 archivo.sql.gz` | Restaurar desde S3 |

Requiere `AWS_BACKUP_BUCKET` en `.env.production`. Ver `docs/BACKUP_RESTORE.md`.

---

## 7. Comandos útiles

```bash
# Compose base (con monitoreo)
COMPOSE="-f docker-compose.yml -f docker-compose.prod.yml -f docker-compose.prod.images.yml -f docker-compose.monitoring.yml --env-file .env.production"

# Logs
docker compose $COMPOSE logs -f backend

# Estado
docker compose $COMPOSE ps

# Health
curl http://localhost:3000/api/health/ready
```

---

## 8. Solución de problemas

| Error | Acción |
|-------|--------|
| "pull access denied" | `docker login` en servidor; revisar `DOCKER_IMAGE_PREFIX` |
| Contenedor en Exit | `docker compose ... logs backend` |
| Caddy no obtiene certificado | Verificar DNS con `nslookup jacapp.online`; esperar propagación |
| 502 Bad Gateway | Esperar 1–2 min; revisar `docker compose ps` |
| Backend no arranca | Revisar `DATABASE_URL`, `DB_PASSWORD` en `.env.production` |

---

## Referencias

- `docs/BACKUP_RESTORE.md` — Restauración detallada
- `docs/CONFIGURACION_DOMINIO_JACAPP.md` — Dominio jacapp.online
- `.env.production.example` — Plantilla de variables
