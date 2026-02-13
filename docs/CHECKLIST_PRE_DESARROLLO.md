# Checklist Pre-Desarrollo – Monorepo JAC

**Objetivo:** Verificar que todo esté configurado antes de iniciar el desarrollo de funcionalidades.

**⚠️ ENFOQUE ACTUAL:** Desarrollo local únicamente. Staging y producción se configurarán más adelante cuando se despliegue en VPS.

**📝 Para setup rápido de desarrollo local:** Ver `SETUP_DESARROLLO_LOCAL.md`

---

## ✅ Estructura del Monorepo

- [ ] Estructura de carpetas creada:
  ```
  jac-app/
  ├── apps/
  │   ├── backend/
  │   └── frontend/
  ├── docker/
  │   ├── nginx/
  │   └── scripts/
  └── docs/
  ```

- [ ] `.gitignore` configurado (excluye `.env`, `node_modules`, `dist`, `.docker`, etc.)
- [ ] `package.json` en root con scripts de workspace
- [ ] README.md con instrucciones básicas

---

## ✅ Docker y Contenedores

### Desarrollo Local (REQUERIDO AHORA)
- [ ] Dockerfile backend creado (multi-stage: dev, build, production)
- [ ] Dockerfile frontend creado (multi-stage: dev, build, production)
- [ ] `docker-compose.yml` configurado para desarrollo
- [ ] Contenedores se levantan correctamente: `docker-compose up`
- [ ] Backend accesible en `http://localhost:3000`
- [ ] Frontend accesible en `http://localhost:5173`
- [ ] PostgreSQL accesible en `localhost:5432`

### Staging (FUTURO - cuando se despliegue)
- [ ] `docker-compose.stage.yml` configurado (ya documentado en `configuracionInfraestructura.md`)
- [ ] Variables de entorno de staging definidas
- [ ] Nginx staging configurado
- [ ] Scripts de deploy a staging funcionando

### Producción (FUTURO - cuando se despliegue)
- [ ] `docker-compose.prod.yml` configurado (ya documentado en `configuracionInfraestructura.md`)
- [ ] Variables de entorno de producción definidas (sin valores sensibles en repo)
- [ ] Nginx producción configurado
- [ ] SSL/TLS configurado
- [ ] Scripts de deploy a producción funcionando

---

## ✅ Base de Datos

- [ ] PostgreSQL corriendo en contenedor
- [ ] Prisma inicializado en backend
- [ ] Schema Prisma creado (basado en `SCHEMA BASE v1.md`)
- [ ] Migraciones funcionando: `npx prisma migrate dev`
- [ ] Conexión desde backend funciona
- [ ] Script de inicialización de DB (`init-db.sh`) funcionando
- [ ] Script de backup (`backup.sh`) funcionando
- [ ] Volúmenes Docker configurados para persistencia

---

## ✅ Backend (NestJS)

- [ ] Proyecto NestJS inicializado en `apps/backend`
- [ ] Estructura de carpetas creada:
  ```
  apps/backend/
  ├── src/
  │   ├── domain/        # Servicios de dominio
  │   ├── application/    # Casos de uso
  │   ├── infrastructure/ # Prisma, S3, etc.
  │   ├── controllers/    # Endpoints HTTP
  │   └── main.ts
  ├── prisma/
  │   └── schema.prisma
  └── Dockerfile
  ```

- [ ] Prisma configurado y conectado
- [ ] Variables de entorno cargadas correctamente
- [ ] Health check endpoint funcionando: `GET /api/health`
- [ ] CORS configurado
- [ ] Scripts npm configurados: `start:dev`, `start:prod`, `build`
- [ ] Backend se ejecuta correctamente en contenedor

---

## ✅ Frontend (React + Vite)

- [ ] Proyecto React + Vite inicializado en `apps/frontend`
- [ ] Tailwind CSS configurado
- [ ] Axios configurado
- [ ] Variables de entorno configuradas (`VITE_API_URL`)
- [ ] Scripts npm configurados: `dev`, `build`, `preview`
- [ ] Frontend se ejecuta correctamente en contenedor
- [ ] Frontend puede comunicarse con backend

---

## ✅ Variables de Entorno

- [ ] `.env.example` creado para backend con todas las variables
- [ ] `.env.example` creado para frontend
- [ ] `.env.development` creado (valores de desarrollo)
- [ ] `.env.staging` creado (sin valores sensibles)
- [ ] `.env.production` creado (sin valores sensibles)
- [ ] Documentación de variables de entorno en `configuracionInfraestructura.md`
- [ ] Variables sensibles gestionadas fuera del repositorio

### Variables Backend Requeridas:
- [ ] `NODE_ENV`
- [ ] `PORT`
- [ ] `DATABASE_URL`
- [ ] `JWT_SECRET`
- [ ] `JWT_REFRESH_SECRET`
- [ ] `AWS_REGION`
- [ ] `AWS_ACCESS_KEY_ID`
- [ ] `AWS_SECRET_ACCESS_KEY`
- [ ] `AWS_S3_BUCKET_NAME`
- [ ] `WOMPI_PUBLIC_KEY`
- [ ] `WOMPI_PRIVATE_KEY`
- [ ] `WOMPI_WEBHOOK_SECRET`
- [ ] `CORS_ORIGIN`

### Variables Frontend Requeridas:
- [ ] `VITE_API_URL`

---

## ✅ Nginx (FUTURO - cuando se despliegue)

- [ ] Configuración Nginx desarrollo creada (opcional para desarrollo local)
- [ ] Configuración Nginx staging creada (documentada en `configuracionInfraestructura.md`)
- [ ] Configuración Nginx producción creada (documentada en `configuracionInfraestructura.md`)
- [ ] Reverse proxy configurado correctamente
- [ ] SSL/TLS configurado (staging y producción)
- [ ] Headers de seguridad configurados
- [ ] Rate limiting configurado (producción)

---

## ✅ Scripts y Utilidades

- [ ] Scripts npm en root:
  - [ ] `npm run dev` → levanta desarrollo
  - [ ] `npm run stage:up` → levanta staging
  - [ ] `npm run prod:up` → levanta producción
  - [ ] `npm run backup` → ejecuta backup
  - [ ] `npm run migrate:dev` → migra en desarrollo
  - [ ] `npm run migrate:stage` → migra en staging
  - [ ] `npm run migrate:prod` → migra en producción

- [ ] Scripts de Docker funcionando:
  - [ ] `docker-compose up` → desarrollo
  - [ ] `docker-compose -f docker/docker-compose.stage.yml up` → staging
  - [ ] `docker-compose -f docker/docker-compose.prod.yml up` → producción

---

## ✅ Health Checks

- [ ] Endpoint `/api/health` implementado en backend
- [ ] Health check verifica conexión a base de datos
- [ ] Health checks configurados en docker-compose
- [ ] Health checks funcionando correctamente

---

## ✅ Logs

- [ ] Logs configurados por servicio
- [ ] Logs accesibles vía `docker-compose logs`
- [ ] Rotación de logs configurada (opcional)
- [ ] Nivel de logs configurable por ambiente

---

## ✅ Seguridad

- [ ] `.env` en `.gitignore`
- [ ] Variables sensibles no commitadas
- [ ] CORS configurado correctamente
- [ ] SSL/TLS configurado para staging y producción
- [ ] Headers de seguridad en Nginx
- [ ] Rate limiting en producción
- [ ] Secrets management planificado (Docker secrets o similar)

---

## ✅ Documentación

- [ ] `configuracionInfraestructura.md` completo
- [ ] README.md con instrucciones de setup
- [ ] Documentación de comandos Docker
- [ ] Documentación de variables de entorno
- [ ] Documentación de scripts de deploy

---

## ✅ Pruebas Básicas

- [ ] Desarrollo local funciona end-to-end:
  - [ ] Backend responde en `http://localhost:3000/api/health`
  - [ ] Frontend carga en `http://localhost:5173`
  - [ ] Frontend puede hacer requests al backend
  - [ ] Base de datos conectada y migraciones aplicadas

- [ ] Staging funciona (si está configurado):
  - [ ] Servicios se levantan correctamente
  - [ ] Nginx funciona
  - [ ] SSL funciona

---

## 🎯 Criterio de "Listo para Desarrollo"

**Puedes iniciar la Fase 1 cuando:**

1. ✅ Monorepo estructurado y funcionando
2. ✅ Docker configurado para desarrollo local
3. ✅ Backend y frontend corriendo en contenedores
4. ✅ Base de datos PostgreSQL conectada y migraciones funcionando
5. ✅ Variables de entorno de desarrollo configuradas
6. ✅ Health checks funcionando
7. ✅ Documentación básica completa

**✅ Staging/producción NO son necesarios ahora** - se configurarán más adelante cuando se despliegue en VPS. La documentación ya está lista en `configuracionInfraestructura.md` para referencia futura.

---

## 📝 Notas Adicionales

- **PostgreSQL:** La documentación oficial usa PostgreSQL. Si prefieres MySQL, cambiar imagen Docker y scripts.
- **Secrets:** Nunca commitear valores reales de `.env`. Usar Docker secrets o variables del servidor.
- **Backups:** Configurar cron job para backups automáticos antes de producción.
- **SSL:** En producción usar Let's Encrypt o certificados propios.

---

**Referencia:** `configuracionInfraestructura.md` para detalles técnicos completos.
