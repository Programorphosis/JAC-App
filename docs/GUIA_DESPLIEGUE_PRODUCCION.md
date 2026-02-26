# Guía de Despliegue a Producción — JAC App

> Documento generado a partir de la sesión de revisión de arquitectura (Feb 2026).
> Cubre: estado de readiness, arquitectura de backups, nginx interno y configuración del servidor.

---

## 1. Estado de readiness — qué está listo y qué falta

### ✅ Código y configuración (100% listo)

| Item | Archivo(s) |
|------|-----------|
| Dockerfiles multi-stage (backend + frontend) | `apps/backend/Dockerfile`, `apps/frontend/Dockerfile` |
| Orquestación de producción | `docker-compose.yml` |
| HTTPS automático con Caddy (Let's Encrypt) | `Caddyfile`, `docker-compose.yml` |
| Migraciones automáticas al arrancar | `apps/backend/entrypoint.sh` |
| Health checks liveness `/health/live` y readiness `/health/ready` | `health.controller.ts` |
| Logging estructurado JSON en producción (`ProdLogger`) | `apps/backend/src/main.ts` |
| Validación de variables de entorno al arrancar | `apps/backend/src/main.ts` |
| Helmet (headers de seguridad HTTP) | `apps/backend/src/main.ts` |
| Rate limiting global | `ThrottlerModule` |
| Pool de conexiones Postgres limitado (`connection_limit=5`) | `docker-compose.yml`, `.env.production.example` |
| Micro-pausa en crons del día 1 (evitar congelar API) | `platform-facturas.service.ts` |
| Índices compuestos multi-tenant | `schema.prisma`, migración `20260219100000` |
| Scripts de backup local + S3 | `scripts/backup-db.sh`, `scripts/restore-db.sh` |
| Monitoreo con Uptime Kuma | `docker-compose.monitoring.yml` |
| Plantilla de variables de entorno documentada | `.env.production.example` |

### ⏳ Pasos manuales pendientes (fuera del código)

#### En AWS
- [ ] Crear bucket S3 para documentos de producción: `asojac-bucket-prod`
- [ ] Crear bucket S3 para backups: `asojac-backups-prod`
- [ ] Verificar permisos IAM: `s3:PutObject`, `s3:GetObject`, `s3:ListBucket`, `s3:DeleteObject` en ambos buckets

#### Wompi
- [ ] Solicitar claves de **producción** en [dashboard.wompi.co](https://dashboard.wompi.co) → Desarrolladores

#### Dominio
- [ ] Tener un dominio registrado (ej. `asojac.co`, `mi-jac.com`)

#### Servidor (AWS Lightsail u otro VPS — mínimo 2GB RAM)
- [ ] Crear instancia Linux (Ubuntu 22.04 o 24.04)
- [ ] Instalar Docker + Docker Compose v2
- [ ] Instalar AWS CLI v2
- [ ] Configurar firewall: solo puertos **22, 80, 443** abiertos
- [ ] Configurar SSH con llave (deshabilitar login por contraseña)
- [ ] Apuntar el DNS del dominio a la IP del servidor (**antes** de levantar Caddy)
- [ ] Subir el código (`git clone`)
- [ ] Crear `.env.production` con todos los valores reales
- [ ] Ejecutar `docker compose --env-file .env.production up -d --build`
- [ ] Instalar cron de backup: `./scripts/backup-db.sh --install-cron`
- [ ] Verificar que Caddy obtuvo el certificado SSL

#### Primer arranque de la app
- [ ] Llamar al endpoint de bootstrap para crear el primer `PLATFORM_ADMIN`
- [ ] Verificar `https://tu-dominio.com/api/health/ready` responde `200`

### 🟡 Deuda técnica menor (no bloquea el lanzamiento)

- **CI/CD** (GitHub Actions para deploy automático) — el deploy actual es manual
- **Alertas en Uptime Kuma** — el monitoreo existe pero sin notificaciones configuradas
- **Lifecycle policy en S3** para mover backups viejos a Glacier automáticamente
- **Separar políticas IAM** (una para backend, otra para backups)
- **2FA** para la cuenta del `PLATFORM_ADMIN`

---

## 2. Arquitectura de backups

### Flujo

```
pg_dump (dentro del contenedor postgres)
        ↓ gzip
  ./backups/jac_jac_db_20260220_020000.sql.gz   ← local (30 días)
        ↓ aws s3 cp --storage-class STANDARD_IA
  s3://asojac-backups-prod/db-backups/jac_...   ← S3 (90 días)
```

### Por qué dos buckets separados

| Bucket | Variable | Propósito |
|--------|----------|-----------|
| `asojac-bucket-prod` | `AWS_S3_BUCKET_NAME` | Documentos de usuarios, PDFs de cartas |
| `asojac-backups-prod` | `AWS_BACKUP_BUCKET` | Dumps de PostgreSQL |

**Razones de la separación:**
- **Permisos distintos**: el backend no necesita acceso a los backups; el script del servidor no necesita acceso a los documentos.
- **Políticas de ciclo de vida distintas**: los documentos de usuarios nunca se borran automáticamente; los backups sí se rotan.
- **Costos más claros**: facturación separada en AWS para cada uso.
- **Seguridad**: si las credenciales del backend se comprometen, los backups históricos no están en riesgo.

### `STANDARD_IA` (Infrequent Access)

Los backups se suben con clase de almacenamiento `STANDARD_IA`, que es más barata que `STANDARD` para datos que se leen raramente. Un backup comprimido de 10-50 MB cuesta centavos por mes.

### Retención diferenciada

- **Local**: 30 días (el servidor tiene espacio limitado)
- **S3**: 90 días (barato guardar más tiempo, más opciones de recuperación ante desastre)

### Comandos disponibles

```bash
# Backup manual
./scripts/backup-db.sh

# Instalar cron automático (una sola vez en el servidor — 2:00 AM diario)
./scripts/backup-db.sh --install-cron

# Listar backups disponibles en S3
./scripts/restore-db.sh --list-s3

# Restaurar desde S3 (descarga y restaura)
./scripts/restore-db.sh --from-s3 jac_jac_db_20260220_020000.sql.gz

# Restaurar desde archivo local
./scripts/restore-db.sh backups/jac_jac_db_20260220_020000.sql.gz
```

> ⚠️ El script de restauración siempre pide confirmación explícita escribiendo `SI` antes de borrar datos.

---

## 3. Arquitectura de red (cómo encajan los contenedores)

```
Internet (HTTPS/HTTP)
        ↓
  Caddy :80/:443          ← único punto público, gestiona SSL automáticamente
        ↓ HTTP interno
  nginx (frontend) :80    ← sirve Angular + proxy /api → backend
        ↓ HTTP interno
  NestJS (backend) :3000  ← procesa API
        ↓
  PostgreSQL :5432        ← solo red interna, nunca expuesto al exterior
```

### Nginx interno del frontend — qué hace cada bloque

**1. Sirve la SPA Angular**
```nginx
location / {
    try_files $uri $uri/ /index.html;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}
```
Angular es una Single Page Application: todo el HTML está en `index.html` y el routing lo maneja JavaScript. Sin `try_files`, refrescar `/pagos/retorno` daría 404 porque nginx buscaría un archivo físico que no existe.

El `no-cache` en `index.html` es intencional: permite detectar nuevas versiones de la app sin que el browser use una versión antigua cacheada.

**2. Proxy de `/api/` al backend**
```nginx
location /api/ {
    proxy_pass http://backend:3000/api/;
}
```
El browser solo conoce un dominio. Nginx intercepta todo lo que empiece con `/api/` y lo reenvía internamente al contenedor `backend:3000`. El browser nunca sabe que el backend existe como servicio separado.

**3. Cache de 1 año para assets con hash**
```nginx
location ~* \.(js|css|woff2|...)$ {
    expires 1y;
    add_header Cache-Control "public, immutable";
}
```
Angular en modo producción genera archivos con hash en el nombre (`main.abc123.js`). Si el contenido cambia, el nombre cambia. Por eso se pueden cachear por 1 año sin problemas: el browser los descarga una vez y no los vuelve a pedir hasta la próxima versión.

### Por qué Caddy + nginx y no solo uno de los dos

Caddy solo maneja el SSL y el tráfico externo. Nginx maneja la lógica de routing de la app. Esta separación permite en el futuro reemplazar Caddy por un Load Balancer de AWS (para escalar) sin tocar la configuración de nginx.

---

## 4. Configurar `.env.production` en el servidor

### Paso 1 — Crear el archivo desde la plantilla

```bash
cp .env.production.example .env.production
nano .env.production
```

En `nano`: `Ctrl+W` para buscar, `Ctrl+O` + `Enter` para guardar, `Ctrl+X` para salir.

### Paso 2 — Generar los secretos en el servidor

```bash
# JWT_SECRET
openssl rand -base64 64

# JWT_REFRESH_SECRET
openssl rand -base64 64

# ENCRYPTION_MASTER_KEY
openssl rand -hex 32

# BOOTSTRAP_TOKEN (solo para el primer arranque)
openssl rand -base64 32

# DB_PASSWORD
openssl rand -base64 24
```

Copiar el output de cada comando y pegarlo en el campo correspondiente del `.env.production`.

### Paso 3 — Valores que vienen de afuera

| Variable | De dónde se obtiene |
|----------|-------------------|
| `DOMAIN` | El dominio que registraste |
| `WOMPI_PRIVATE_KEY` / `PUBLIC_KEY` / `INTEGRITY_SECRET` / `EVENTS_SECRET` | Dashboard Wompi → producción |
| `AWS_ACCESS_KEY_ID` / `AWS_SECRET_ACCESS_KEY` | AWS Console → IAM |
| `AWS_S3_BUCKET_NAME` | Nombre del bucket prod creado en S3 |
| `AWS_BACKUP_BUCKET` | Nombre del bucket de backups creado en S3 |
| `AWS_CLOUDFRONT_DOMAIN` | CloudFront → tu distribución → Domain name |

### Paso 4 — Verificar que no quedaron valores sin llenar

```bash
grep "<CAMBIAR\|<GENERAR" .env.production
```

Si el comando no devuelve nada, el archivo está limpio.

### Paso 5 — Proteger el archivo

```bash
chmod 600 .env.production
```

Con `600` solo el dueño del archivo puede leer y escribir. Nadie más en el servidor tiene acceso.

### Paso 6 — Validar que Docker Compose lee bien las variables

```bash
docker compose --env-file .env.production config
```

Si no da errores de sintaxis, está bien. Si hay algo mal indica exactamente qué variable tiene el problema.

### Paso 7 — Levantar

```bash
docker compose --env-file .env.production up -d --build
```

Verificar que todo arrancó:

```bash
# Estado de los contenedores
docker compose ps

# Logs en tiempo real
docker compose logs -f

# Health check del backend
curl http://localhost:3000/api/health/ready
# Debe responder: {"status":"ok","database":"connected"}
```

---

## 5. Optimizaciones de rendimiento aplicadas

Estas mejoras se implementaron en base al análisis de cuellos de botella para un VPS de 2GB RAM / 2 vCPU con hasta 100 juntas y 50.000 usuarios registrados:

### Pool de conexiones Postgres
```
?connection_limit=5&pool_timeout=10
```
En un VPS de 2GB no se quieren más de 10-15 conexiones totales a Postgres. Si el pool está lleno, falla en 10 segundos en vez de colgar indefinidamente.

### Micro-pausa en crons del día 1
Los jobs de facturación mensual insertan pausas de 150ms entre cada junta procesada. Evita saturar CPU y conexiones de BD cuando hay muchas suscripciones activas.

### Índices compuestos multi-tenant
Añadidos en la migración `20260219100000_add_composite_indexes`:

| Tabla | Índice | Uso |
|-------|--------|-----|
| `Pago` | `(juntaId, fechaPago)` | Listados del mes por junta |
| `Carta` | `(juntaId, estado)` | Filtros por estado dentro de una junta |
| `Carta` | `(juntaId, fechaSolicitud)` | Listados paginados |
| `Auditoria` | `(juntaId, fecha)` | Historial de eventos paginados |

Sin estos índices, con 50.000+ registros las queries hacen full table scans con latencia creciente. Con índices compuestos, el crecimiento es casi lineal.

### Capacidad estimada con esta arquitectura

| Escenario | Estimación |
|-----------|-----------|
| Juntas registradas | 100–300 sin problemas |
| Usuarios concurrentes globales | 20–40 sin problema |
| Requests por segundo en pico | 5–10 |
| Cuándo escalar | CPU > 70% sostenido, RAM > 85%, latencia > 400ms |
| Primer upgrade | Plan 4GB (no RDS todavía) |

---

## 6. Instalar AWS CLI v2 en el servidor (Ubuntu)

Requerido para que `backup-db.sh` pueda subir backups a S3:

```bash
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install
aws --version  # Verificar instalación
```
