# JAC App

Sistema digital para **Juntas de Acción Comunal** en Colombia. Multi-tenant, auditable, sin pagos parciales. Diseñado para ser defendible ante auditorías legales y contables.

## Stack

| Capa | Tecnología |
|------|-----------|
| Backend | Node.js 20+, NestJS 11, Prisma 6, PostgreSQL |
| Frontend | Angular 19, Angular Material, Tailwind CSS |
| Auth | JWT (access + refresh), bcrypt |
| Pagos | Wompi (sandbox/production, credenciales por junta) |
| Storage | AWS S3 (documentos, escudos, cartas PDF) |
| Email | AWS SES |
| Infra | Docker, Caddy (HTTPS/reverse proxy) |

## Estructura del proyecto

```
jac-app/
├── apps/
│   ├── backend/          # NestJS API
│   │   ├── src/
│   │   │   ├── auth/           # JWT, guards, permisos
│   │   │   ├── domain/         # Servicios de dominio (puros, sin framework)
│   │   │   ├── application/    # Servicios de aplicación (orquestación)
│   │   │   ├── infrastructure/ # Prisma adapters, S3, Wompi, email
│   │   │   ├── platform/       # Admin de plataforma
│   │   │   ├── common/         # Filtros, middleware, utilidades
│   │   │   └── health/         # Health checks
│   │   └── prisma/             # Schema y migraciones
│   └── frontend/         # Angular SPA
├── docs/                 # Documentación técnica
├── scripts/              # Backup, deploy, validación
├── docker-compose.yml
└── Caddyfile
```

## Requisitos previos

- Node.js >= 18
- PostgreSQL 15+
- npm (workspaces)

## Instalación

```bash
# Clonar e instalar dependencias
git clone <repo-url> && cd jac-app
npm install

# Configurar variables de entorno
cp .env.local.example .env.local
# Editar .env.local con tus valores (DB, JWT, etc.)

# Generar cliente Prisma y correr migraciones
cd apps/backend
npx prisma generate
npx prisma migrate dev

# (Opcional) Seed de desarrollo
npm run db:seed
```

## Desarrollo

```bash
# Backend + Frontend en paralelo
npm run dev

# Solo backend (http://localhost:3000)
npm run dev:backend

# Solo frontend (http://localhost:4200)
npm run dev:frontend

# Prisma Studio (explorar BD)
npm run db:studio
```

## Tests

```bash
# Todos los tests del backend
cd apps/backend && npx jest

# Con coverage
npx jest --coverage

# Watch mode
npx jest --watch
```

**224 tests** cubriendo: dominio (100%), auth/guards (100%), permisos (100%), webhooks, encriptación, utilidades. Ver `docs/TESTING.md` para la estrategia completa.

## Docker (producción)

```bash
# Levantar con docker-compose
npm run docker:prod:up

# Bajar
npm run docker:prod:down
```

Caddy maneja HTTPS automáticamente con Let's Encrypt.

## Variables de entorno

Ver `.env.local.example` y `.env.production.example` para la lista completa. Las variables críticas son:

| Variable | Descripción |
|----------|------------|
| `DATABASE_URL` | Connection string de PostgreSQL |
| `JWT_SECRET` | Clave para firmar access tokens |
| `JWT_REFRESH_SECRET` | Clave para firmar refresh tokens |
| `ENCRYPTION_MASTER_KEY` | 64 hex chars para AES-256-GCM (credenciales Wompi) |
| `BOOTSTRAP_TOKEN` | Token para crear la primera junta |

## API

- Swagger: `http://localhost:3000/api/docs` (solo en desarrollo)
- Health check: `GET /api/health/live`, `GET /api/health/ready`
- Todas las rutas bajo `/api/`

## Documentación

| Documento | Contenido |
|-----------|----------|
| `docs/TESTING.md` | Estrategia de testing, inventario, patrones de mock |
| `docs/AUDITORIA_DEVOPS.md` | Auditoría de seguridad y plan de mejoras |
| `plan.md` | Plan integral del proyecto |
| `ROADMAP.md` | Fases de desarrollo |
| `convencionesAPI.md` | Contrato de API |
| `MATRIZ_PERMISOS_ROLES.md` | Qué puede hacer cada rol |

## Principios

1. **Seguridad > Auditoría > Consistencia > Velocidad**
2. No pagos parciales. No guardar deuda en BD. No editar registros históricos.
3. Toda consulta filtra por `juntaId` (multi-tenant estricto).
4. Backend es la única fuente de verdad.
5. Lógica de negocio en `domain/`, nunca en controllers.
