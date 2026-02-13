# Setup de desarrollo local – JAC App

Guía rápida para levantar el monorepo en tu máquina.

## Requisitos previos

- **Node.js** >= 18
- **Docker Desktop** (PostgreSQL, backend y frontend en contenedores)
- **npm** (viene con Node)

## Pasos

### 1. Clonar e instalar dependencias

```bash
cd "JAC App"
npm install
```

### 2. Iniciar Docker Desktop

Asegúrate de que Docker Desktop esté en ejecución antes de continuar.

### 3. Levantar el stack

```bash
npm run dev
```

Esto inicia:

- **PostgreSQL** en `localhost:5432`
- **Backend NestJS** en `http://localhost:3000/api`
- **Frontend React** en `http://localhost:5173`

### 4. Aplicar migraciones (primera vez)

Si es la primera vez que levantas el proyecto, aplica las migraciones:

```bash
npm run db:migrate
```

Cuando Prisma pregunte el nombre de la migración, puedes usar `init` o aceptar el sugerido.

### 5. Verificar

- **Health del backend:** http://localhost:3000/api/health
- **Frontend:** http://localhost:5173

## Scripts útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Levanta todo el stack (Postgres, backend, frontend) |
| `npm run dev:build` | Reconstruye las imágenes Docker |
| `npm run dev:down` | Detiene los contenedores |
| `npm run dev:logs` | Ver logs en tiempo real |
| `npm run db:migrate` | Ejecuta migraciones de Prisma (contenedor backend debe estar corriendo) |
| `npm run db:studio` | Abre Prisma Studio para inspeccionar la BD |
| `npm run db:reset` | Resetea la BD y vuelve a aplicar migraciones |

## Variables de entorno

- **Backend:** `apps/backend/.env` (ver `apps/backend/.env.example`)
- **Frontend:** `apps/frontend/.env` (ver `apps/frontend/.env.example`)

Para desarrollo local con Docker, las variables ya están configuradas en `docker-compose.yml` para el backend.

## Desarrollo sin Docker (opcional)

Si prefieres correr backend y frontend localmente:

1. Inicia solo Postgres: `docker-compose up -d postgres`
2. En `apps/backend`: `npm run start:dev`
3. En `apps/frontend`: `npm run dev`
4. Aplica migraciones desde `apps/backend`: `npx prisma migrate dev`

## Solución de problemas

- **"Docker Desktop no está corriendo"**: Inicia Docker Desktop y espera a que esté listo.
- **Puerto 5432 en uso**: Detén cualquier instancia local de PostgreSQL o cambia el puerto en `docker-compose.yml`.
- **Error de migración**: Asegúrate de que Postgres esté healthy antes de ejecutar `db:migrate`.
