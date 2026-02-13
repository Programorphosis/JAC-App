# Configuración de Infraestructura – Monorepo JAC

**Versión:** 1.0  
**Objetivo:** Configurar monorepo con Docker para desarrollo, stage y producción.

**⚠️ NOTA IMPORTANTE:** 
- **Desarrollo local:** Ver `SETUP_DESARROLLO_LOCAL.md` para setup rápido de desarrollo.
- **Staging/Producción:** Esta documentación describe la configuración completa para cuando se despliegue en VPS (en unos meses).
- **Por ahora:** Enfocarse en desarrollo local. Esta documentación sirve como referencia futura.

---

## 1. Estructura del Monorepo

```
jac-app/
├── apps/
│   ├── backend/              # NestJS API
│   │   ├── src/
│   │   ├── prisma/
│   │   ├── Dockerfile
│   │   ├── package.json
│   │   └── .env.example
│   │
│   └── frontend/              # React + Vite
│       ├── src/
│       ├── public/
│       ├── Dockerfile
│       ├── package.json
│       └── .env.example
│
├── docker/
│   ├── docker-compose.dev.yml      # Desarrollo local
│   ├── docker-compose.stage.yml    # Staging
│   ├── docker-compose.prod.yml     # Producción
│   ├── nginx/
│   │   ├── nginx.dev.conf
│   │   ├── nginx.stage.conf
│   │   └── nginx.prod.conf
│   └── scripts/
│       ├── init-db.sh
│       ├── backup.sh
│       └── migrate.sh
│
├── .env.example
├── .env.development
├── .env.staging
├── .env.production
├── docker-compose.yml         # Desarrollo (default)
├── package.json              # Workspace root
└── README.md
```

---

## 2. Stack Tecnológico Confirmado

### Backend
- **Runtime:** Node.js 18+ (LTS)
- **Framework:** NestJS
- **ORM:** Prisma
- **Base de datos:** PostgreSQL 15+ 
- **Auth:** JWT (access + refresh tokens)
- **Archivos:** Multer + AWS S3
- **Pagos:** Wompi

### Frontend
- **Framework:** React
- **Build tool:** Vite
- **Styling:** Tailwind CSS
- **HTTP client:** Axios
- **Sin TypeScript** en MVP (según plan)

### Infraestructura
- **Contenedores:** Docker + Docker Compose
- **Reverse proxy:** Nginx
- **Process manager:** PM2 (dentro del contenedor backend)
- **Base de datos:** PostgreSQL en contenedor
- **Volúmenes:** Para persistencia de datos y backups

---

## 3. Variables de Entorno

### Backend (.env.example)

```bash
# App
NODE_ENV=development
PORT=3000
API_PREFIX=api

# Database
DATABASE_URL=postgresql://jac_user:jac_password@postgres:5432/jac_db?schema=public

# JWT
JWT_SECRET=your-super-secret-jwt-key-change-in-production
JWT_EXPIRES_IN=15m
JWT_REFRESH_SECRET=your-super-secret-refresh-key-change-in-production
JWT_REFRESH_EXPIRES_IN=7d

# AWS S3
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your-access-key
AWS_SECRET_ACCESS_KEY=your-secret-key
AWS_S3_BUCKET_NAME=jac-documents

# Wompi
WOMPI_PUBLIC_KEY=your-wompi-public-key
WOMPI_PRIVATE_KEY=your-wompi-private-key
WOMPI_WEBHOOK_SECRET=your-webhook-secret
WOMPI_ENVIRONMENT=sandbox  # o production

# CORS
CORS_ORIGIN=http://localhost:5173

# Logs
LOG_LEVEL=debug  # debug, info, warn, error
```

### Frontend (.env.example)

```bash
VITE_API_URL=http://localhost:3000/api
VITE_APP_NAME=JAC App
```

### Archivos por ambiente

- `.env.development` → Desarrollo local
- `.env.staging` → Staging server
- `.env.production` → Producción (nunca commitear)

---

## 4. Docker Compose – Desarrollo

**Archivo:** `docker-compose.yml` o `docker/docker-compose.dev.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: jac_postgres_dev
    environment:
      POSTGRES_USER: jac_user
      POSTGRES_PASSWORD: jac_password
      POSTGRES_DB: jac_db
    ports:
      - "5432:5432"
    volumes:
      - postgres_data_dev:/var/lib/postgresql/data
      - ./docker/scripts/init-db.sh:/docker-entrypoint-initdb.d/init-db.sh
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U jac_user"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - jac_network

  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
      target: development
    container_name: jac_backend_dev
    command: npm run start:dev
    ports:
      - "3000:3000"
    volumes:
      - ./apps/backend:/app
      - /app/node_modules
      - ./apps/backend/prisma:/app/prisma
    environment:
      - NODE_ENV=development
      - DATABASE_URL=postgresql://jac_user:jac_password@postgres:5432/jac_db?schema=public
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - jac_network
    restart: unless-stopped

  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
      target: development
    container_name: jac_frontend_dev
    command: npm run dev
    ports:
      - "5173:5173"
    volumes:
      - ./apps/frontend:/app
      - /app/node_modules
    environment:
      - VITE_API_URL=http://localhost:3000/api
    depends_on:
      - backend
    networks:
      - jac_network
    restart: unless-stopped

volumes:
  postgres_data_dev:

networks:
  jac_network:
    driver: bridge
```

---

## 5. Docker Compose – Staging

**Archivo:** `docker/docker-compose.stage.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: jac_postgres_stage
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data_stage:/var/lib/postgresql/data
      - ./docker/backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - jac_network_stage
    restart: always

  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
      target: production
    container_name: jac_backend_stage
    command: npm run start:prod
    ports:
      - "3001:3000"
    environment:
      - NODE_ENV=staging
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - AWS_REGION=${AWS_REGION}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_S3_BUCKET_NAME=${AWS_S3_BUCKET_NAME}
      - WOMPI_PUBLIC_KEY=${WOMPI_PUBLIC_KEY}
      - WOMPI_PRIVATE_KEY=${WOMPI_PRIVATE_KEY}
      - WOMPI_WEBHOOK_SECRET=${WOMPI_WEBHOOK_SECRET}
      - WOMPI_ENVIRONMENT=sandbox
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - jac_network_stage
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
      target: production
    container_name: jac_frontend_stage
    ports:
      - "5174:80"
    environment:
      - VITE_API_URL=${VITE_API_URL}
    depends_on:
      - backend
    networks:
      - jac_network_stage
    restart: always

  nginx:
    image: nginx:alpine
    container_name: jac_nginx_stage
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.stage.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
    depends_on:
      - backend
      - frontend
    networks:
      - jac_network_stage
    restart: always

volumes:
  postgres_data_stage:

networks:
  jac_network_stage:
    driver: bridge
```

---

## 6. Docker Compose – Producción

**Archivo:** `docker/docker-compose.prod.yml`

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:15-alpine
    container_name: jac_postgres_prod
    environment:
      POSTGRES_USER: ${DB_USER}
      POSTGRES_PASSWORD: ${DB_PASSWORD}
      POSTGRES_DB: ${DB_NAME}
    volumes:
      - postgres_data_prod:/var/lib/postgresql/data
      - ./docker/backups:/backups
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER}"]
      interval: 10s
      timeout: 5s
      retries: 5
    networks:
      - jac_network_prod
    restart: always
    # No exponer puerto públicamente en producción

  backend:
    build:
      context: ./apps/backend
      dockerfile: Dockerfile
      target: production
    container_name: jac_backend_prod
    command: npm run start:prod
    environment:
      - NODE_ENV=production
      - DATABASE_URL=${DATABASE_URL}
      - JWT_SECRET=${JWT_SECRET}
      - JWT_REFRESH_SECRET=${JWT_REFRESH_SECRET}
      - AWS_REGION=${AWS_REGION}
      - AWS_ACCESS_KEY_ID=${AWS_ACCESS_KEY_ID}
      - AWS_SECRET_ACCESS_KEY=${AWS_SECRET_ACCESS_KEY}
      - AWS_S3_BUCKET_NAME=${AWS_S3_BUCKET_NAME}
      - WOMPI_PUBLIC_KEY=${WOMPI_PUBLIC_KEY}
      - WOMPI_PRIVATE_KEY=${WOMPI_PRIVATE_KEY}
      - WOMPI_WEBHOOK_SECRET=${WOMPI_WEBHOOK_SECRET}
      - WOMPI_ENVIRONMENT=production
      - LOG_LEVEL=info
    depends_on:
      postgres:
        condition: service_healthy
    networks:
      - jac_network_prod
    restart: always
    healthcheck:
      test: ["CMD", "curl", "-f", "http://localhost:3000/api/health"]
      interval: 30s
      timeout: 10s
      retries: 3

  frontend:
    build:
      context: ./apps/frontend
      dockerfile: Dockerfile
      target: production
    container_name: jac_frontend_prod
    environment:
      - VITE_API_URL=${VITE_API_URL}
    depends_on:
      - backend
    networks:
      - jac_network_prod
    restart: always

  nginx:
    image: nginx:alpine
    container_name: jac_nginx_prod
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./docker/nginx/nginx.prod.conf:/etc/nginx/nginx.conf
      - ./docker/nginx/ssl:/etc/nginx/ssl
      - ./docker/nginx/logs:/var/log/nginx
    depends_on:
      - backend
      - frontend
    networks:
      - jac_network_prod
    restart: always

volumes:
  postgres_data_prod:

networks:
  jac_network_prod:
    driver: bridge
```

---

## 7. Dockerfiles

### Backend Dockerfile (Multi-stage)

**Archivo:** `apps/backend/Dockerfile`

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Development
FROM node:18-alpine AS development
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 3000
CMD ["npm", "run", "start:dev"]

# Stage 3: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
RUN npx prisma generate
RUN npm run build

# Stage 4: Production
FROM node:18-alpine AS production
WORKDIR /app
RUN apk add --no-cache curl
COPY --from=build /app/dist ./dist
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/package*.json ./
COPY --from=build /app/prisma ./prisma
RUN npx prisma generate
EXPOSE 3000
CMD ["node", "dist/main"]
```

### Frontend Dockerfile (Multi-stage)

**Archivo:** `apps/frontend/Dockerfile`

```dockerfile
# Stage 1: Dependencies
FROM node:18-alpine AS dependencies
WORKDIR /app
COPY package*.json ./
RUN npm ci

# Stage 2: Development
FROM node:18-alpine AS development
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
EXPOSE 5173
CMD ["npm", "run", "dev", "--", "--host"]

# Stage 3: Build
FROM node:18-alpine AS build
WORKDIR /app
COPY --from=dependencies /app/node_modules ./node_modules
COPY . .
ARG VITE_API_URL
ENV VITE_API_URL=${VITE_API_URL}
RUN npm run build

# Stage 4: Production
FROM nginx:alpine AS production
COPY --from=build /app/dist /usr/share/nginx/html
COPY docker/nginx/frontend.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

---

## 8. Configuración Nginx

### Nginx Staging (`docker/nginx/nginx.stage.conf`)

```nginx
upstream backend {
    server backend:3000;
}

upstream frontend {
    server frontend:80;
}

server {
    listen 80;
    server_name stage.jac-app.local;

    # Redirect HTTP to HTTPS
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name stage.jac-app.local;

    ssl_certificate /etc/nginx/ssl/cert.pem;
    ssl_certificate_key /etc/nginx/ssl/key.pem;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;

    # Frontend
    location / {
        proxy_pass http://frontend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    # Backend API
    location /api {
        proxy_pass http://backend;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Timeouts para operaciones largas
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Health check
    location /health {
        access_log off;
        proxy_pass http://backend/api/health;
    }
}
```

### Nginx Producción (`docker/nginx/nginx.prod.conf`)

Similar a staging pero con:
- Dominio real
- Certificados SSL válidos (Let's Encrypt)
- Rate limiting
- Logs rotativos
- Compresión gzip

---

## 9. Scripts de Utilidad

### Inicialización de Base de Datos (`docker/scripts/init-db.sh`)

```bash
#!/bin/bash
set -e

echo "Esperando a PostgreSQL..."
until pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB"; do
  sleep 1
done

echo "PostgreSQL está listo"
```

### Backup (`docker/scripts/backup.sh`)

```bash
#!/bin/bash
BACKUP_DIR="/backups"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_FILE="$BACKUP_DIR/jac_db_$TIMESTAMP.sql"

pg_dump -U "$POSTGRES_USER" -d "$POSTGRES_DB" > "$BACKUP_FILE"

# Mantener solo últimos 7 días
find "$BACKUP_DIR" -name "jac_db_*.sql" -mtime +7 -delete

echo "Backup creado: $BACKUP_FILE"
```

### Migración (`docker/scripts/migrate.sh`)

```bash
#!/bin/bash
cd /app
npx prisma migrate deploy
npx prisma generate
```

---

## 10. Health Checks

### Backend (`apps/backend/src/health/health.controller.ts`)

```typescript
import { Controller, Get } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Controller('health')
export class HealthController {
  constructor(private prisma: PrismaService) {}

  @Get()
  async check() {
    try {
      await this.prisma.$queryRaw`SELECT 1`;
      return { status: 'ok', database: 'connected' };
    } catch (error) {
      return { status: 'error', database: 'disconnected' };
    }
  }
}
```

---

## 11. Scripts de Package.json (Root)

```json
{
  "scripts": {
    "dev": "docker-compose up",
    "dev:build": "docker-compose build",
    "dev:down": "docker-compose down",
    "stage:up": "docker-compose -f docker/docker-compose.stage.yml up -d",
    "stage:down": "docker-compose -f docker/docker-compose.stage.yml down",
    "stage:logs": "docker-compose -f docker/docker-compose.stage.yml logs -f",
    "prod:up": "docker-compose -f docker/docker-compose.prod.yml up -d",
    "prod:down": "docker-compose -f docker/docker-compose.prod.yml down",
    "prod:logs": "docker-compose -f docker/docker-compose.prod.yml logs -f",
    "backup": "docker exec jac_postgres_prod /backups/backup.sh",
    "migrate:dev": "docker exec jac_backend_dev npm run prisma:migrate",
    "migrate:stage": "docker exec jac_backend_stage npm run prisma:migrate",
    "migrate:prod": "docker exec jac_backend_prod npm run prisma:migrate"
  }
}
```

---

## 12. Checklist Pre-Desarrollo

### Infraestructura Base
- [ ] Crear estructura de carpetas del monorepo
- [ ] Configurar Dockerfiles (backend y frontend)
- [ ] Configurar docker-compose para desarrollo
- [ ] Configurar docker-compose para staging
- [ ] Configurar docker-compose para producción
- [ ] Configurar Nginx para staging y producción
- [ ] Crear archivos `.env.example` para backend y frontend
- [ ] Configurar volúmenes para persistencia de datos
- [ ] Configurar health checks

### Base de Datos
- [ ] Inicializar Prisma en backend
- [ ] Configurar migraciones
- [ ] Script de inicialización de DB
- [ ] Script de backup automático
- [ ] Configurar conexión desde contenedores

### Seguridad
- [ ] Variables de entorno seguras (no commitear `.env`)
- [ ] Configurar SSL/TLS para producción
- [ ] Configurar CORS correctamente
- [ ] Rate limiting en Nginx
- [ ] Secrets management (considerar Docker secrets o Vault)

### CI/CD Básico
- [ ] Script de build para cada ambiente
- [ ] Script de deploy
- [ ] Configurar webhooks de Git (opcional)
- [ ] Logs centralizados

### Monitoreo y Logs
- [ ] Configurar logs por servicio
- [ ] Health check endpoints
- [ ] Considerar herramientas de monitoreo (opcional: Prometheus, Grafana)

---

## 13. Notas Importantes

1. **PostgreSQL vs MySQL:** La documentación oficial usa PostgreSQL. Si prefieres MySQL, cambiar:
   - Imagen Docker: `mysql:8` o `mariadb:latest`
   - Connection string en DATABASE_URL
   - Scripts de backup (`mysqldump` en lugar de `pg_dump`)

2. **Secrets:** Nunca commitear `.env` con valores reales. Usar Docker secrets o variables de entorno del servidor.

3. **Backups:** Configurar cron job en el servidor para ejecutar backups automáticos.

4. **SSL:** En producción usar Let's Encrypt con Certbot o certificados propios.

5. **Redes:** Cada ambiente (dev/stage/prod) debe tener su propia red Docker para aislamiento.

6. **Volúmenes:** Los volúmenes de PostgreSQL deben persistir entre reinicios. Considerar backups externos.

---

## 14. Próximos Pasos

1. Crear estructura de carpetas
2. Inicializar proyectos NestJS y React
3. Configurar Prisma con PostgreSQL
4. Crear Dockerfiles y docker-compose
5. Configurar Nginx
6. Probar en desarrollo local
7. Configurar servidor staging
8. Configurar servidor producción
9. Implementar backups automáticos
10. Configurar monitoreo básico

---

**Documento de referencia:** Este documento complementa `plan.md` y `ROADMAP.md` con la configuración técnica de infraestructura necesaria antes de iniciar el desarrollo.
