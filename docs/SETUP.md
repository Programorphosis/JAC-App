# Configuración del proyecto JAC

Guía paso a paso para levantar el proyecto en desarrollo local.

---

## 1. Requisitos

| Tecnología | Versión |
|------------|---------|
| Node.js | 20.19+ o 22.12+ |
| PostgreSQL | 15+ |
| npm | 9+ |

---

## 2. PostgreSQL

### Instalar PostgreSQL

- **Windows:** https://www.postgresql.org/download/windows/
- Durante la instalación, anota la contraseña del usuario `postgres`.

### Crear usuario y base de datos

Abre `psql` o pgAdmin y ejecuta (conectado como `postgres`):

```sql
CREATE USER jac_user WITH PASSWORD 'jac_password_dev';
CREATE DATABASE jac_db_dev OWNER jac_user;
GRANT ALL PRIVILEGES ON DATABASE jac_db_dev TO jac_user;
```

---

## 3. Variables de entorno

### Backend (`apps/backend/.env`)

Crea o edita `apps/backend/.env`. Mínimo necesario:

```
DATABASE_URL=postgresql://USUARIO:CONTRASEÑA@localhost:5432/NOMBRE_DB?schema=public
JWT_SECRET=dev-secret-change-in-production
JWT_REFRESH_SECRET=dev-refresh-secret-change-in-production
PORT=3000
CORS_ORIGIN=http://localhost:4200
```

> **Nota:** Frontend Angular usa puerto 4200. Asegura `CORS_ORIGIN=http://localhost:4200` en backend.

**Ejemplo** (si usaste los valores del paso anterior):

```
DATABASE_URL=postgresql://jac_user:jac_password_dev@localhost:5432/jac_db_dev?schema=public
```

**Zona horaria (Colombia):** PostgreSQL guarda fechas en UTC. Si quieres que las fechas se interpreten en hora de Bogotá al usar `now()` o literales, añade a la URL: `&options=-c%20timezone%3DAmerica%2FBogota`. El backend también ejecuta `SET time zone 'America/Bogota'` al conectar. Al consultar la BD con un cliente (pgAdmin, DBeaver), configura la zona horaria del cliente a America/Bogota para ver las horas en hora local.

**Para cartas con QR** (opcional en desarrollo): si usas S3 y generas PDF con QR, define `APP_PUBLIC_URL` como la URL base del API (donde está `/api/public/validar-carta`). En local: `http://localhost:3000`. En producción: `https://api.tudominio.com`. Por defecto usa `http://localhost:3000` si no está definida.

**Si tu contraseña tiene caracteres especiales** (`@`, `#`, `:`, etc.), codifícalos en URL:
- `@` → `%40`
- `#` → `%23`
- `:` → `%3A`

Prisma lee `DATABASE_URL` automáticamente desde `apps/backend/.env`.

### Frontend

**Stack:** Angular (ver `ARQUITECTURA_FRONTEND_ANGULAR.md`).

**Inicializar (Fase 9.0):** Si `apps/frontend` tiene `node_modules` residual, elimínalo antes de crear el proyecto Angular. Luego: `npx @angular/cli@19 new frontend --directory=apps/frontend` desde la raíz del proyecto.

Variables de entorno en `src/environments/environment.ts`:

```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:3000/api',
  appName: 'JAC App'
};
```

---

## 4. Instalar dependencias

Desde la **raíz del proyecto**:

```bash
npm install
```

---

## 5. Inicializar la base de datos

```bash
# Crear tablas (migraciones)
npm run db:migrate

# Cargar datos de prueba (usuarios, roles, etc.)
npm run db:seed
```

---

## 6. Levantar la aplicación

```bash
npm run dev
```

Esto inicia backend (puerto 3000) y frontend Angular (puerto 4200).

**O por separado:**

```bash
# Terminal 1 - Backend
npm run dev:backend

# Terminal 2 - Frontend
npm run dev:frontend
```

---

## 7. URLs

| Servicio | URL |
|----------|-----|
| Backend API | http://localhost:3000/api |
| Frontend (Angular) | http://localhost:4200 |
| Prisma Studio | http://localhost:5555 (`npm run db:studio`) |

---

## 8. Credenciales de prueba (tras el seed)

| Rol | Documento | Contraseña |
|-----|-----------|------------|
| Admin Junta | 12345678 | DevAdmin123! |
| Platform Admin | 00000000 | DevPlatform123! |

Login: `POST http://localhost:3000/api/auth/login`

---

## 9. Comandos útiles

| Comando | Descripción |
|---------|-------------|
| `npm run dev` | Backend + frontend |
| `npm run db:migrate` | Aplicar migraciones |
| `npm run db:seed` | Cargar datos de prueba |
| `npm run db:studio` | Abrir Prisma Studio |
| `npm run db:reset` | Borrar BD y volver a migrar |

---

## Solución de problemas

**"Authentication failed" con la base de datos**
- Verifica que PostgreSQL esté corriendo
- Revisa usuario, contraseña y nombre de la base en `DATABASE_URL`
- Prueba la conexión: `psql -h localhost -U jac_user -d jac_db_dev -W`

**Prisma no encuentra `.env`**
- El `.env` debe estar en `apps/backend/`
- Prisma busca `.env` en el directorio del schema (`prisma/schema.prisma`)
