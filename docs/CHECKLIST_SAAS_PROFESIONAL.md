# Checklist SaaS Profesional – JAC App

**Versión:** 1.1  
**Fecha:** 2026-02-25  
**Objetivo:** Documento de referencia detallado para validar y completar la transformación del sistema JAC en un SaaS sólido y profesional. Cada punto incluye contexto, criterios de validación y guía de implementación.

**Complemento:** `CHECKLIST_OPERACION_JUNTAS.md` cubre la operación diaria de las juntas (usuarios, pagos, cartas, requisitos, etc.).

---

## Índice

1. [Introducción y uso del documento](#1-introducción-y-uso-del-documento)
2. [Infraestructura operativa](#2-infraestructura-operativa)
3. [Modelo de negocio y facturación](#3-modelo-de-negocio-y-facturación)
4. [Comunicación y notificaciones](#4-comunicación-y-notificaciones)
5. [Experiencia de cliente](#5-experiencia-de-cliente)
6. [Legal y comercial](#6-legal-y-comercial)
7. [Seguridad y cumplimiento](#7-seguridad-y-cumplimiento)
8. [Orden de implementación recomendado](#8-orden-de-implementación-recomendado)

---

## 1. Introducción y uso del documento

### 1.1 Propósito

Este documento sirve como:

- **Checklist de validación:** Marcar cada ítem cuando esté implementado y verificado.
- **Guía de implementación:** Cada punto incluye qué hacer, por qué y cómo validar.
- **Referencia de prioridad:** Los ítems están ordenados por impacto y dependencias.

### 1.2 Cómo usarlo

1. **Antes de implementar:** Leer la sección completa del ítem para entender contexto y criterios.
2. **Durante la implementación:** Seguir la guía técnica y los criterios de validación.
3. **Después de implementar:** Marcar el checkbox `[ ]` → `[x]` y documentar cualquier desviación.
4. **En code review:** Usar los criterios de validación como checklist de revisión.

### 1.3 Estado actual (resumen)

_Última verificación real en código: 2026-02-25_

| Área | Estado | Evidencia |
|------|--------|-----------|
| Multi-tenant (juntaId en cada query) | ✅ Sólido | `00_ARQUITECTURA_RECTOR copy.md` |
| Modelo SaaS (planes, suscripciones) | ✅ Implementado | `FLUJOS_SUSCRIPCIONES_PLANES.md` |
| Overrides automáticos (cron día 1) | ✅ Implementado | `facturas-cron.service.ts` |
| Overrides manuales | ✅ Eliminado | Dialog removido; solo modelo automático |
| Docker + Caddy HTTPS | ✅ Completo | `docker-compose.yml`, `apps/*/Dockerfile` |
| Backups automáticos pg_dump → S3 | ✅ Completo | `scripts/backup-db.sh` |
| Gestión de secretos (.env.example + validateEnv) | ✅ Completo | `apps/backend/.env.example`, `main.ts` |
| Logs estructurados JSON en producción | ✅ Implementado | `ProdLogger` en `main.ts` |
| Health checks /health/live y /health/ready | ✅ Completo | `health.controller.ts` + docker-compose healthcheck |
| Monitoreo (Uptime Kuma + pgAdmin) | ✅ Disponible | `docker-compose.monitoring.yml` |
| Rate limiting (ThrottlerModule) | ✅ Implementado | `app.module.ts`, decoradores en endpoints clave |
| Refresh token rotativo | ✅ Implementado | `auth.service.ts`, `POST /auth/refresh` |
| Cifrado en reposo credenciales Wompi (AES-256-GCM) | ✅ Completo | `infrastructure/encryption/encryption.service.ts` |
| HMAC verificación webhook Wompi | ✅ Implementado | `webhooks.controller.ts` |
| Auditoría login exitoso/fallido | ✅ Implementado | `auth.service.ts` – LOGIN_EXITOSO, LOGIN_FALLIDO |
| Auditoría impersonación inicio/fin | ✅ Implementado | `auth.service.ts` – IMPERSONACION_INICIO, IMPERSONACION_FIN |
| Auditoría cambios de rol | ✅ Implementado | `users.service.ts` – evento CAMBIO_ROL |
| Export CSV pagos | ✅ Implementado | `pagos.service.ts`, `GET /pagos/exportar` |
| Auto-servicio datos de contacto junta | ✅ Implementado | `PATCH /api/mi-junta/datos` |
| Estado de cuenta / barras de uso | ✅ Implementado | `plan-suscripcion.component` con `progresoPct()` |
| Dar de baja usuario (UI botón explícito) | ✅ Implementado | `usuario-detail.component` – botón + ConfirmDialog |
| CI/CD | ❌ Pendiente | No existe `.github/workflows/` |
| Servicio de email transaccional | ✅ Implementado | `infrastructure/email/email.service.ts` – Mailgun |
| Notificaciones por evento (email) | ✅ Implementado | factura pendiente, vencimiento 1/3 días, vencida, pago confirmado |
| 2FA | ❌ Pendiente | — |
| Onboarding guiado / checklist de setup | ⚠️ Parcial – banners (escudo, tarifas) sin checklist completo | `dashboard.component` |
| Portal de facturación (detalle + descarga PDF) | ✅ Listado, detalle, comprobante HTML imprimible/Guardar PDF | `facturas-plataforma.component` |
| Flujo de cancelación de suscripción | ✅ Implementado | `plan-suscripcion.component` – botón, confirmación, cancelacionSolicitada |
| Términos de servicio | ✅ Implementado | `/terminos`, checkbox en junta-form, terminosAceptadosEn en Junta |
| Política de privacidad | ✅ Implementado | `/privacidad`, checkboxes en junta-form y usuario-form |

---

## 2. Infraestructura operativa

### 2.1 Deploy con Docker

#### Contexto

Actualmente no hay Dockerfiles ni docker-compose. El desarrollo local depende de instalar Node, PostgreSQL y ejecutar manualmente backend y frontend. Para staging y producción se necesita un entorno reproducible y portable.

#### Qué implementar

- [x] **Dockerfile backend (multi-stage)** — `apps/backend/Dockerfile`
  - Stage `build`: instalar dependencias, compilar NestJS.
  - Stage `production`: solo `node_modules` de producción, `dist/`, sin devDependencies.
  - Usuario no-root para ejecutar la app.
  - Variables de entorno en runtime (no en build).

- [x] **Dockerfile frontend (multi-stage)** — `apps/frontend/Dockerfile`
  - Stage `build`: instalar dependencias, `ng build --configuration=production`.
  - Stage `production`: servir con Nginx (archivos estáticos).

- [x] **docker-compose.yml de producción** — `docker-compose.yml`
  - Servicios: postgres, backend, frontend, caddy (HTTPS automático Let's Encrypt).
  - Red interna, healthchecks, `depends_on condition: service_healthy`.
  - Variables desde `.env.production` (no versionado).
  - Caddy único punto expuesto a internet.

#### Criterios de validación

- [ ] `docker-compose up` levanta backend, frontend y DB sin errores.
- [ ] Backend conecta a PostgreSQL del contenedor.
- [ ] Frontend consume API del backend (misma red o URL configurada).
- [ ] Migraciones de Prisma se ejecutan correctamente contra la DB del contenedor.
- [ ] No hay credenciales hardcodeadas en Dockerfiles.

#### Referencias

- `ROADMAP.md` Fase 0.5.2
- `configuracionInfraestructura.md` (si existe)

---

### 2.2 Backups de base de datos

#### Contexto

Sin backups automáticos, cualquier fallo de disco, corrupción o error humano puede implicar pérdida total de datos. Para un SaaS con información financiera y legal, los backups son obligatorios.

#### Qué implementar

- [x] **Script de backup** — `scripts/backup-db.sh`
  - pg_dump dentro del contenedor, comprime con gzip.
  - Nombre con timestamp: `jac_{DB_NAME}_{YYYY_MMDD_HHMMSS}.sql.gz`.
  - Guarda local y sube a S3 (`AWS_BACKUP_BUCKET`).
  - Log de éxito/fallo en cada paso.

- [x] **Política de retención** — implementada en el script
  - Retención local: `RETENTION_DAYS` (default 30 días).
  - Retención S3: `S3_RETENTION_DAYS` (default 90 días).
  - Limpieza automática de copias antiguas en S3 via `aws s3api list-objects-v2`.

- [x] **Automatización**
  - `./scripts/backup-db.sh --install-cron` instala cron diario a las 2:00 AM.
  - Logs en `/var/log/jac-backup.log`.

- [ ] **Prueba de restauración** ← _pendiente: hacer al menos una vez y documentar_

#### Criterios de validación

- [ ] El script genera un archivo `.dump` válido.
- [ ] `pg_restore` sobre una DB vacía restaura correctamente.
- [ ] El cron (o job) ejecuta el backup sin intervención manual.
- [ ] Los backups se almacenan fuera del servidor de aplicación (ej. S3, otro disco).

#### Referencias

- `ROADMAP.md` Fase 0.5.6, Fase 12
- `plan.md` – Backups automáticos

---

### 2.3 CI/CD (integración y despliegue continuo)

#### Contexto

Sin pipelines automatizados, cada deploy depende de pasos manuales propensos a errores. Un CI/CD básico garantiza que solo código probado llegue a producción.

#### Qué implementar

- [ ] **Pipeline de CI (en cada push/PR)**
  - Instalar dependencias (backend y frontend).
  - Lint (ESLint, Prettier si aplica).
  - Tests unitarios (si existen).
  - Build de backend y frontend.
  - Verificar que las migraciones de Prisma son aplicables (ej. `prisma migrate deploy` en DB temporal).

- [ ] **Pipeline de CD (opcional en fase inicial)**
  - Trigger: merge a `main` o tag.
  - Build de imágenes Docker.
  - Push a registry (Docker Hub, GitHub Container Registry, etc.).
  - Deploy a servidor (SSH + docker-compose pull, o Kubernetes si se escala).

- [ ] **Secretos**
  - Nunca en el repositorio.
  - Usar secretos del CI (GitHub Secrets, GitLab CI variables, etc.).
  - Inyectar en el entorno de deploy, no en el código.

#### Criterios de validación

- [ ] Cada PR ejecuta lint y build sin errores.
- [ ] Un merge a `main` (o equivalente) dispara el pipeline configurado.
- [ ] No hay credenciales en logs ni en artefactos públicos.
- [ ] El deploy a staging/producción es repetible y documentado.

#### Referencias

- `ROADMAP.md` Fase 12
- GitHub Actions, GitLab CI o similar

---

### 2.4 Health checks completos

#### Contexto

Existe `/health` que solo verifica conexión a PostgreSQL. Para orquestadores (Docker, Kubernetes) y balanceadores se necesitan endpoints diferenciados: liveness (¿está vivo?) y readiness (¿puede recibir tráfico?).

#### Qué implementar

- [x] **GET /health/live (liveness)** — `health.controller.ts`
  - Responde 200 sin consultar DB. Solo verifica que el proceso está vivo.

- [x] **GET /health/ready (readiness)** — `health.controller.ts`
  - Ejecuta `SELECT 1` contra PostgreSQL. Devuelve 503 si la DB está caída.

- [x] **Configuración en docker-compose** — `docker-compose.yml`
  - healthcheck en postgres (pg_isready), backend (/health/live) y frontend.
  - `depends_on condition: service_healthy` en toda la cadena.

#### Criterios de validación

- [ ] `/health/live` responde en < 50 ms sin depender de DB.
- [ ] `/health/ready` devuelve 503 si la DB está caída.
- [ ] `docker-compose` usa healthcheck y los servicios arrancan en orden correcto.
- [ ] Documentación de los endpoints para operaciones.

#### Referencias

- `ROADMAP.md` Fase 0.5.7
- `apps/backend/src/health/health.controller.ts`

---

### 2.5 Gestión de secretos y variables de entorno

#### Contexto

Las credenciales (DB, Wompi, S3, JWT secret) no deben estar en el código ni en el repositorio. Deben gestionarse de forma segura por entorno.

#### Qué implementar

- [x] **Archivo .env.example** — `apps/backend/.env.example`
  - Lista todas las variables con descripción.

- [ ] **Documentación de secretos** ← _mejorable: podría añadirse tabla de variables en README o .env.example_

- [x] **Verificación en arranque** — `main.ts` función `validateEnv()`
  - Verifica `DATABASE_URL`, `JWT_SECRET`, `JWT_REFRESH_SECRET`, `ENCRYPTION_MASTER_KEY`.
  - Si falta alguna → `process.exit(1)` con mensaje claro.
  - No hay valores inseguros por defecto para secretos.

#### Criterios de validación

- [ ] `.env` está en `.gitignore` y nunca se commitea.
- [ ] `.env.example` está actualizado y permite levantar el proyecto (con valores de prueba).
- [ ] No hay secretos en el historial de git (si se filtró alguno, rotar inmediatamente).
- [ ] La app no arranca si falta `DATABASE_URL` o `JWT_SECRET`.

#### Referencias

- `ROADMAP.md` Fase 0.5.4
- `investigacionImplementacionDeSeguridadDeLaApp.md`

---

### 2.6 Logs estructurados

#### Contexto

Actualmente se usa `console.log`. En producción se necesitan logs estructurados (JSON), niveles (info, warn, error) y rotación para diagnóstico y auditoría.

#### Qué implementar

- [x] **Logger estructurado** — `ProdLogger` en `main.ts`
  - Formato JSON en producción (NODE_ENV=production).
  - Campos: ts, level, ctx, msg, trace.
  - En desarrollo: logger por defecto de NestJS (legible).
  - Compatible con Loki, CloudWatch, Datadog, ELK.

- [x] **Niveles por entorno**
  - Producción: ProdLogger JSON (stderr para warn/error, stdout para info/debug).
  - Desarrollo: logger NestJS estándar.

- [ ] **Rotación de archivos de log** ← _no aplica si se usa Docker con stdout/stderr (lo gestiona el daemon de Docker); si se escribe a archivo, añadir rotación_

- [x] **No loguear datos sensibles**
  - Stack traces van a logs internos, no al cliente (DomainExceptionFilter maneja esto).

#### Criterios de validación

- [ ] Los logs se escriben en formato JSON en producción.
- [ ] Se puede filtrar por nivel y por módulo.
- [ ] Los archivos rotan y no crecen indefinidamente.
- [ ] No hay datos sensibles en los logs.

#### Referencias

- `ROADMAP.md` Fase 0.5.7
- NestJS Logger, Winston, Pino

---

### 2.7 Monitoreo y alertas

#### Contexto

Sin monitoreo no se detectan fallos hasta que un usuario reporta. Para un SaaS profesional se necesitan métricas básicas y alertas ante incidentes.

#### Qué implementar

- [ ] **Métricas básicas**
  - Latencia de endpoints críticos (pagos, login, facturación).
  - Tasa de errores (5xx, 4xx).
  - Uso de DB (conexiones, queries lentas si es posible).
  - Opcional: Prometheus + Grafana, o servicio gestionado (Datadog, New Relic).

- [ ] **Alertas**
  - Uptime: servicio no responde (ej. Pingdom, UptimeRobot).
  - Errores: tasa de 5xx > umbral.
  - DB: conexiones agotadas o latencia alta.
  - Canal: email, Slack, PagerDuty según disponibilidad.

- [ ] **Dashboard operativo**
  - Estado de servicios (backend, DB, cron).
  - Últimas facturas generadas, pagos registrados.
  - Juntas activas, suscripciones vencidas.

#### Criterios de validación

- [ ] Hay al menos una alerta de uptime configurada.
- [ ] Las alertas llegan al canal configurado.
- [ ] Existe un dashboard o vista que muestre el estado operativo.
- [ ] Se documenta el procedimiento de respuesta a alertas.

#### Referencias

- `ROADMAP.md` Fase 12
- `plan.md` – Observabilidad

---

## 3. Modelo de negocio y facturación

### 3.1 Unificación del modelo de overrides

#### Contexto

Según `MODELO_OVERRIDES_CONSUMO.md`, los overrides deben ser **automáticos**. Implementado (2026-02-25).

#### Implementado

- [x] **Frontend: eliminar "Solicitar overrides"**
  - `SolicitarOverridesDialogComponent` eliminado (era dead code, no estaba conectado).
  - No existe botón "Solicitar aumento de capacidad" en la UI.
  - Alertas de límites ya existen en `plan-suscripcion.component` vía `getAlertas`.

- [x] **Backend: modelo automático**
  - Cron día 1: `generarFacturasOverridesMensuales` genera facturas OVERRIDE por exceso.
  - Usa límites del plan para calcular exceso.

- [ ] **Campos `overrideLimite*` en Suscripción** — _mantener para compatibilidad con datos históricos_

#### Referencias

- `MODELO_OVERRIDES_CONSUMO.md`
- `FLUJOS_SUSCRIPCIONES_PLANES.md` §7
- `apps/backend/src/platform/facturas/platform-facturas.service.ts` – `generarFacturasOverridesMensuales`

---

### 3.2 Portal de facturación para la junta

#### Contexto

La junta necesita ver su historial de facturas, descargar comprobantes y entender qué debe pagar. Actualmente existe `facturas-plataforma` pero puede mejorarse para un portal completo.

#### Qué implementar

- [x] **Listado de facturas**
  - Todas las facturas de la junta (pendientes, pagadas, vencidas).
  - Filtros por estado, tipo, rango de fechas.
  - Paginación.

- [x] **Detalle de factura**
  - Monto, fecha emisión, vencimiento, estado.
  - Desglose si es OVERRIDE (usuarios, storage, cartas).
  - Historial de pagos aplicados a la factura.

- [x] **Descarga de comprobante**
  - PDF o documento descargable con los datos de la factura.
  - Incluir: junta, concepto, monto, fecha, referencia.

- [x] **Botón "Pagar ahora"**
  - Para facturas PENDIENTE, VENCIDA, PARCIAL.
  - Redirige a intención de pago (Wompi) como ya existe.
  - Mensaje claro cuando el pago está en proceso o falló.

#### Criterios de validación

- [x] La junta ve todas sus facturas con filtros útiles.
- [x] Puede descargar un comprobante en formato legible.
- [x] El flujo "Pagar ahora" funciona end-to-end.
- [x] Los estados (PENDIENTE, PAGADA, VENCIDA) se muestran correctamente.
- [x] No se exponen facturas de otras juntas (validar juntaId en backend).

#### Referencias

- `apps/frontend/src/app/features/facturas-plataforma/`
- `apps/backend/src/platform/facturas/`

---

### 3.3 Flujo de cancelación de suscripción

#### Contexto

No hay un flujo explícito de cancelación. Una junta que quiera dejar de usar el servicio debe tener un proceso claro: qué pasa con los datos, hasta cuándo tiene acceso, si hay reembolso.

#### Qué implementar

- [x] **Definir política de cancelación**
  - ¿Cancelación inmediata o al fin del ciclo?
  - ¿Se reembolsa el periodo no consumido? (generalmente no en SaaS mensual).
  - ¿Qué pasa con los datos? (retención X días, exportación, borrado).
  - Documentar en términos de servicio.

- [x] **Acción "Cancelar suscripción"**
  - Ubicación: en plan-suscripcion o en configuración de junta.
  - Requiere confirmación explícita (diálogo con advertencias).
  - Backend: actualizar Suscripción.estado = CANCELADA (o similar).
  - Fecha efectiva: fin del ciclo actual (fechaVencimiento) o inmediata según política.

- [x] **Consecuencias de cancelación**
  - Bloquear acceso cuando estado = CANCELADA y fechaVencimiento < hoy.
  - Mensaje claro: "Tu suscripción ha sido cancelada. Los datos se conservarán hasta [fecha]. Contacta soporte para exportar."

- [ ] **Reactivación**
  - Si la junta cancela por error: flujo para reactivar (crear nueva suscripción o reactivar la existente según diseño).

#### Criterios de validación

- [x] Existe un botón o acción "Cancelar suscripción" con confirmación.
- [x] La política está documentada y es coherente con la implementación.
- [x] Al cancelar, el acceso se restringe según las reglas definidas.
- [x] El usuario recibe un mensaje claro sobre retención de datos y próximos pasos.
- [x] Se registra en auditoría la cancelación.

#### Referencias

- `PLAN_ADMINISTRADOR_PLATAFORMA.md` – Ciclo de vida de juntas
- `EstadoSuscripcion` en schema (ACTIVA, SUSPENDIDA, CANCELADA, PRUEBA, VENCIDA)

---

## 4. Comunicación y notificaciones

### 4.1 Servicio de email transaccional

#### Contexto

Implementado con Mailgun. Las juntas reciben notificaciones automáticas sobre facturas, vencimientos y pagos.

#### Implementado (2026-02-25)

- [x] **Infraestructura de email** — Mailgun
  - `mailgun.js` + `form-data`. Soporta región US y EU.
  - Templates HTML responsivos con marca JAC App.
  - Si `MAILGUN_API_KEY` o `MAILGUN_DOMAIN` no están configurados, los envíos se omiten silenciosamente (no crashea la app).

- [x] **Servicio de envío en backend** — `infrastructure/email/email.service.ts`
  - `enviarFacturaPendiente()` – factura nueva (manual, renovación, override).
  - `enviarSuscripcionPorVencer()` – 1 y 3 días antes de vencimiento.
  - `enviarSuscripcionVencida()` – cuando el cron marca VENCIDA.
  - `enviarPagoConfirmado()` – cuando la factura queda PAGADA.
  - Errores solo en logs; no propaga excepciones.

- [x] **Variables de entorno** — `.env.example`
  - `MAILGUN_API_KEY`, `MAILGUN_DOMAIN`, `MAILGUN_REGION`, `EMAIL_FROM`, `APP_PUBLIC_URL`.

#### Referencias

- `apps/backend/src/infrastructure/email/`
- Mailgun: https://www.mailgun.com/

---

### 4.2 Notificaciones por evento

#### Contexto

Cada evento crítico dispara la notificación correspondiente. Implementado (2026-02-25).

#### Implementado

- [x] **Factura pendiente (nueva)**
  - Trigger: `crearFactura()` y `generarFacturasRenovacion()` en `platform-facturas.service.ts`.
  - Destinatario: `Junta.email` (si existe).
  - Contenido: concepto, monto, fecha vencimiento, enlace a `/facturas-plataforma`.

- [x] **Suscripción por vencer (1 y 3 días antes)**
  - Trigger: cron diario 09:00 AM. `handleNotificacionesVencimientoProximo()` en `facturas-cron.service.ts`.
  - Aplica a suscripciones ACTIVA y PRUEBA.
  - Enlace a facturas pendientes.

- [x] **Suscripción vencida**
  - Trigger: cuando `marcarSuscripcionesVencidasConJuntas()` marca VENCIDA.
  - Email: "Tu suscripción ha vencido. Renueva para recuperar el acceso."
  - Incluir enlace a facturas.

- [ ] **Renovación próxima (7 días)** — _pendiente_
  - El cron de renovación ya genera facturas 7 días antes; el email de factura pendiente cubre el caso.

- [x] **Pago registrado**
  - Trigger: `registrarPago()` cuando la factura queda en estado PAGADA.
  - Email: "Hemos recibido tu pago de [monto] COP. Gracias."
  - Enlace a portal de facturas.

#### Referencias

- `apps/backend/src/platform/facturas/platform-facturas.service.ts`
- `apps/backend/src/platform/facturas/facturas-cron.service.ts`

---

### 4.3 Avisos in-app (opcional)

#### Contexto

Además de email, las alertas pueden mostrarse en la aplicación (banner, notificaciones).

#### Qué implementar

- [ ] **Banner de factura pendiente**
  - Si la junta tiene facturas PENDIENTE o VENCIDA, mostrar banner en el layout.
  - Mensaje: "Tienes [N] factura(s) pendiente(s). [Pagar ahora]"
  - Desaparece cuando no hay facturas pendientes.

- [ ] **Alertas de límites**
  - Ya existe `getAlertas` en LimitesService.
  - Mostrar en dashboard o en plan-suscripcion cuando hay alertas ADVERTENCIA o CRITICO.
  - Mensaje claro: "Estás cerca del límite de [usuarios/storage/cartas]. Considera actualizar tu plan."

- [ ] **Suscripción vencida**
  - Si la junta tiene suscripción VENCIDA, bloquear o limitar la UI con mensaje claro.
  - "Tu suscripción ha vencido. Renueva para continuar."

#### Criterios de validación

- [ ] El banner de facturas pendientes se muestra cuando aplica.
- [ ] Las alertas de límites son visibles en la pantalla correspondiente.
- [ ] El bloqueo por suscripción vencida es efectivo y el mensaje es claro.
- [ ] No hay falsos positivos (mostrar alertas cuando no corresponde).

#### Referencias

- `apps/frontend/src/app/core/layout/`
- `LimitesService.getAlertas`
- `AvisoPlataforma` (avisos globales)

---

## 5. Experiencia de cliente

### 5.1 Onboarding guiado

#### Contexto

Una junta nueva puede no saber por dónde empezar. Un onboarding guiado reduce abandono y mejora la adopción.

#### Qué implementar

- [ ] **Checklist de configuración inicial**
  - Pasos: configurar datos de la junta, agregar usuarios, configurar Wompi (si aplica), elegir plan.
  - Estado por paso: pendiente, en progreso, completado.
  - Mostrar en dashboard o en una vista dedicada.

- [ ] **Tour guiado (opcional)**
  - Tooltips o pasos que guíen al admin en la primera visita.
  - Librería: Shepherd.js, Intro.js, o similar.
  - No intrusivo: poder cerrar y no volver a mostrar.

- [ ] **Mensajes contextuales**
  - Si no hay usuarios: "Agrega el primer usuario para comenzar."
  - Si no hay Wompi configurado: "Configura los pagos online para recibir pagos."
  - Enlaces directos a las pantallas correspondientes.

#### Criterios de validación

- [ ] El checklist refleja los pasos reales necesarios para operar.
- [ ] El usuario puede marcar pasos como completados (o se infiere del estado).
- [ ] Los mensajes son claros y accionables.
- [ ] El tour (si existe) no bloquea el uso de la app.
- [ ] Se puede omitir o cerrar el onboarding sin perder funcionalidad.

#### Referencias

- `flujoBootstrapYOnboarding.md`
- `ARQUITECTURA_FRONTEND_ANGULAR.md`

---

### 5.2 Auto-servicio de datos de contacto

#### Contexto

La junta debe poder actualizar sus datos de contacto (teléfono, email, dirección) sin depender del Platform Admin.

#### Qué implementar

- [x] **Edición de datos de junta**
  - Endpoint: `PATCH /api/mi-junta` (o similar) para actualizar campos permitidos.
  - Permisos: ADMIN de la junta.
  - Campos: telefono, email, direccion, ciudad, departamento (los que apliquen).
  - Validación: email válido si se proporciona.

- [x] **UI en Mi JAC**
  - Formulario o sección para editar datos de contacto.
  - Guardar con confirmación.
  - Mensaje de éxito o error.

#### Criterios de validación

- [x] El ADMIN de la junta puede actualizar los datos de contacto.
- [x] Los cambios se persisten correctamente.
- [x] Solo se permiten los campos definidos (no modificar NIT u otros sensibles sin restricción).
- [ ] Se registra en auditoría (opcional pero recomendado).
- [x] El email actualizado se usa para notificaciones posteriores.

#### Referencias

- `apps/backend/src/application/mi-junta/`
- `Junta` en schema – telefono, email, direccion, ciudad, departamento

---

### 5.3 Estado de cuenta y proyección de costos

#### Contexto

La junta debe entender cuánto está consumiendo y cuánto pagará. Actualmente hay alertas de límites, pero puede mejorarse con una vista consolidada.

#### Qué implementar

- [x] **Dashboard de uso**
  - Usuarios actuales / límite.
  - Storage usado (MB) / límite.
  - Cartas este mes / límite.
  - Barras de progreso o indicadores visuales.
  - Ya existe `getUsoActual` y `getAlertas`; integrar en la UI.

- [x] **Proyección de overrides**
  - Si el plan es personalizable y hay exceso: "Este mes se facturará aproximadamente [X] COP por exceso."
  - Cálculo: exceso × precio por unidad (usuarios, MB, cartas).
  - Mensaje: "Considera actualizar tu plan si el exceso es recurrente."

- [ ] **Historial de facturación**
  - Gráfico o tabla: facturas pagadas por mes, monto total.
  - Ayuda a la junta a entender su gasto histórico.

#### Criterios de validación

- [x] El dashboard muestra uso actual vs límites de forma clara.
- [x] La proyección de overrides (si aplica) es coherente con el cálculo del cron.
- [x] Los datos son correctos (no hay desfase entre backend y frontend).
- [x] La vista es comprensible para un usuario no técnico.
- [x] Los límites "ilimitados" se muestran correctamente (sin barra o con indicador especial).

#### Referencias

- `LimitesService.getUsoActual`, `getAlertas`, `getUsoParaMes`
- `plan-suscripcion.component` – ya muestra consumo y alertas
- `MODELO_OVERRIDES_CONSUMO.md` – precios por exceso

---

## 6. Legal y comercial

### 6.1 Términos de servicio

#### Contexto

Todo SaaS debe tener términos de servicio que definan el contrato entre el proveedor y el cliente (la junta). Sin ellos, hay riesgo legal y de disputas.

#### Qué implementar

- [x] **Redacción de términos**
  - Alcance del servicio.
  - Obligaciones del proveedor y del cliente.
  - Uso aceptable (prohibiciones).
  - Limitación de responsabilidad.
  - Propiedad intelectual.
  - Modificaciones (cómo se notifican cambios).
  - Ley aplicable y jurisdicción.
  - Revisar con abogado si el producto es comercial.

- [x] **Publicación**
  - Página pública `/terminos` o `/legal/terminos`.
  - Fecha de última actualización visible.
  - Versión o hash para trazabilidad si se modifican.

- [x] **Aceptación**
  - En registro o al crear junta: checkbox "Acepto los términos de servicio."
  - Guardar fecha de aceptación (en Junta o en tabla separada).
  - No permitir continuar sin aceptar.

#### Criterios de validación

- [x] Los términos están publicados y son accesibles sin login.
- [x] La fecha de actualización es visible.
- [x] El flujo de aceptación está implementado donde corresponda.
- [x] Se guarda evidencia de la aceptación (fecha, versión).
- [x] Los términos son coherentes con el funcionamiento real del sistema (facturación, cancelación, datos).

#### Referencias

- Plantillas: Termly, Iubenda, o asesoría legal
- `plan.md` – Contexto legal
- **`docs/legal/`** – Investigación legislación colombiana, inventario y plan de documentación legal:
  - `INVESTIGACION_LEGISLACION_COLOMBIANA_JAC_SAAS.md` – Normativa aplicable
  - `INVENTARIO_DOCUMENTACION_LEGAL_OBLIGATORIA.md` – Requisitos por documento
  - `INDEX.md` – Índice para revisión profesional
  - `RESULTADOS_INVESTIGACION_LEGAL.md` – Resumen y próximos pasos

---

### 6.2 Política de privacidad

#### Contexto

Se procesan datos personales (usuarios, pagos, documentos). La política de privacidad debe explicar qué se recoge, para qué y cómo se protege.

#### Qué implementar

- [x] **Contenido de la política**
  - Datos que se recogen (nombre, documento, email, etc.).
  - Finalidad del tratamiento.
  - Base legal (consentimiento, ejecución de contrato, etc.).
  - Compartir con terceros (Wompi, AWS S3, etc.).
  - Retención de datos.
  - Derechos del usuario (acceso, rectificación, eliminación, portabilidad).
  - Contacto del responsable.
  - Cambios en la política (cómo se notifican).

- [x] **Publicación**
  - Página `/privacidad` o `/legal/privacidad`.
  - Enlace en footer y en formularios de registro.
  - Fecha de última actualización.

- [x] **Cumplimiento**
  - Si aplica GDPR o ley colombiana de protección de datos, asegurar que la política y el tratamiento sean coherentes.
  - Mecanismo para ejercer derechos (ej. email de contacto, formulario).

#### Criterios de validación

- [x] La política está publicada y es accesible.
- [x] Describe los datos que el sistema realmente procesa.
- [x] Menciona los terceros con los que se comparten datos (Wompi, AWS).
- [x] Hay un canal para ejercer derechos de privacidad.
- [x] La política se actualiza cuando cambia el tratamiento de datos.
- [ ] Se revisa con asesoría legal si el producto es comercial.

#### Referencias

- Ley 1581 de 2012 (Colombia) – Protección de datos personales
- GDPR (si hay usuarios en UE)
- Plantillas: Termly, Iubenda
- **`docs/legal/INVESTIGACION_LEGISLACION_COLOMBIANA_JAC_SAAS.md`** – Ley 1581, D. 1377, RNBD

---

### 6.3 Política de cancelación y reembolsos

#### Contexto

Las juntas deben saber qué pasa si cancelan: si hay reembolso, hasta cuándo tienen acceso, qué ocurre con sus datos.

#### Qué implementar

- [x] **Definición de política**
  - Cancelación: inmediata o al fin del ciclo.
  - Reembolso: generalmente no en SaaS (periodo consumido no reembolsable).
  - Excepciones: si se ofrece garantía de satisfacción, definir condiciones.
  - Acceso a datos: hasta fecha X después de cancelación; luego exportación o borrado.
  - Documentar en términos de servicio o en página dedicada.

- [x] **Comunicación**
  - Al cancelar: mensaje que resuma la política ("No hay reembolso por el periodo actual. Tendrás acceso hasta [fecha].").
  - En la página de precios o planes: enlace a "Política de cancelación".

- [x] **Implementación técnica**
  - Coherente con el flujo de cancelación (ver §3.3).
  - No prometer reembolsos si el sistema no los soporta.
  - Si en el futuro se implementan reembolsos, documentar el proceso y los criterios.

#### Criterios de validación

- [x] La política está documentada y es clara.
- [x] Es coherente con el flujo técnico de cancelación.
- [x] El usuario la ve antes o durante la cancelación.
- [x] No hay contradicciones entre términos, política de cancelación y comportamiento de la app.
- [x] Si hay reembolsos, el proceso está definido y documentado.

#### Referencias

- `PLAN_ADMINISTRADOR_PLATAFORMA.md` – Ciclo de vida
- Términos de servicio (§6.1)

---

### 6.4 Facturación electrónica (Colombia)

#### Contexto

En Colombia, la facturación electrónica puede ser obligatoria según el régimen de la junta. La plataforma debe poder emitir documentos que cumplan con la DIAN si aplica.

#### Qué implementar

- [ ] **Evaluación de obligación**
  - Determinar si las juntas como clientes de la plataforma requieren factura electrónica.
  - Si la plataforma es el proveedor del servicio SaaS, puede ser obligatorio emitir factura electrónica a las juntas.
  - Consultar con contador o asesor tributario.

- [ ] **Integración con proveedor**
  - Proveedores: Siigo, Alegra, Zoho, o proveedores especializados en facturación electrónica Colombia.
  - Flujo: al registrar un pago, generar factura electrónica y enviarla al cliente.
  - Almacenar referencia (CUFE, número de factura) en la Factura o en metadata.

- [ ] **Documento descargable**
  - Mínimo: PDF con datos de la factura (concepto, monto, fecha, datos del emisor y receptor).
  - Ideal: XML y PDF de factura electrónica según formato DIAN.
  - Enlace en el portal de facturación para descargar.

#### Criterios de validación

- [ ] Se ha evaluado la obligación legal de facturación electrónica.
- [ ] Si aplica: existe integración o proceso para emitir facturas válidas.
- [ ] El cliente puede descargar un comprobante de pago.
- [ ] Los datos del comprobante son correctos y auditables.
- [ ] Se conserva trazabilidad (factura ↔ pago ↔ suscripción).

#### Referencias

- Resoluciones DIAN sobre facturación electrónica
- `PLAN_ADMINISTRADOR_PLATAFORMA.md` – Facturación
- Proveedores de facturación electrónica en Colombia

---

## 7. Seguridad y cumplimiento

### 7.1 Autenticación en dos factores (2FA)

#### Contexto

Para cuentas con acceso sensible (ADMIN, Platform Admin), la 2FA reduce el riesgo de compromiso por robo de contraseña.

#### Qué implementar

- [ ] **Opcional para ADMIN de junta**
  - Permitir activar 2FA (TOTP: Google Authenticator, Authy).
  - Al activar: mostrar QR, guardar secret encriptado.
  - En login: si 2FA activo, pedir código de 6 dígitos además de password.
  - Códigos de recuperación para perder el dispositivo.

- [ ] **Obligatorio para Platform Admin (recomendado)**
  - Platform Admin debe tener 2FA obligatorio.
  - Mismo flujo TOTP.
  - Sin 2FA no se permite login como Platform Admin.

- [ ] **Backend**
  - Librería: `speakeasy` o `otplib` para TOTP.
  - Guardar `usuario.totpSecret` encriptado (o en tabla separada).
  - Validar código en el flujo de login.

#### Criterios de validación

- [ ] Un usuario puede activar 2FA y el login requiere el código.
- [ ] Los códigos de recuperación funcionan cuando se pierde el dispositivo.
- [ ] El secret no se expone en logs ni en respuestas API.
- [ ] Platform Admin (si se implementa obligatorio) no puede hacer login sin 2FA.
- [ ] Se puede desactivar 2FA con contraseña + código actual (para recuperación).

#### Referencias

- `investigacionImplementacionDeSeguridadDeLaApp.md`
- NestJS Passport, estrategia JWT + TOTP
- `speakeasy`, `otplib`, `qrcode`

---

### 7.2 Auditoría de accesos sensibles

#### Contexto

Además de la auditoría de acciones de negocio (pagos, cartas, etc.), se deben registrar accesos sensibles: logins, cambios de rol, impersonación.

#### Qué implementar

- [x] **Login exitoso y fallido** — `auth.service.ts`
  - `LOGIN_EXITOSO` registrado en Auditoria (línea ~131).
  - `LOGIN_FALLIDO` registrado en Auditoria con motivo (línea ~415).
  - Si no hay juntaId (Platform Admin / junta no identificada): solo console.warn, sin guardar en BD.

- [x] **Impersonación** — `auth.service.ts`
  - `IMPERSONACION_INICIO` (línea ~307) y `IMPERSONACION_FIN` (línea ~374) registrados en Auditoria.

- [x] **Cambios de rol** — `users.service.ts` (2026-02-25)
  - Evento `CAMBIO_ROL` con `rolesAnteriores` y `rolesNuevos` cuando el rol efectivamente cambia.
  - Solo se registra si los roles son distintos (no en ediciones de otros campos).

- [x] **Consulta de auditoría**
  - Admin de junta: ya puede ver auditoría de su junta.
  - Platform Admin: puede ver auditoría a través de panel de administración.

#### Criterios de validación

- [x] Los logins (éxito y fallo) se registran con datos suficientes para investigación.
- [x] La impersonación deja rastro completo.
- [x] Los cambios de rol se auditan.
- [x] Los logs son inmutables (solo INSERT).
- [x] No se registran contraseñas ni tokens en los logs.
- [x] Platform Admin puede consultar la auditoría de accesos.

#### Referencias

- `00_ARQUITECTURA_RECTOR copy.md` §8 – Auditoría obligatoria
- `Auditoria` en schema
- `investigacionImplementacionDeSeguridadDeLaApp.md`

---

### 7.3 Cifrado en reposo y en tránsito

#### Contexto

Los datos sensibles deben estar cifrados en reposo (DB, S3) y en tránsito (HTTPS). Las credenciales de Wompi ya se almacenan por junta; deben estar cifradas.

#### Qué implementar

- [x] **En tránsito** — Caddy en `docker-compose.yml`
  - HTTPS automático con Let's Encrypt (Caddy).
  - HTTP redirige automáticamente a HTTPS.
  - HTTP/3 (QUIC) soportado.

- [ ] **En reposo – Base de datos** ← _depende del proveedor de hosting; documentar si se usa AWS RDS (cifrado nativo) o servidor propio (LUKS)_

- [ ] **En reposo – S3** ← _verificar que el bucket tenga SSE-S3 o SSE-KMS habilitado en la consola AWS_

- [x] **Credenciales sensibles (Wompi)** — `infrastructure/encryption/encryption.service.ts`
  - AES-256-GCM con clave maestra desde `ENCRYPTION_MASTER_KEY` (env var).
  - `wompiPrivateKey`, `wompiPublicKey`, `wompiEventsSecret` cifrados en DB.
  - Solo se descifran en memoria cuando se usan (`pagos.service.ts`, `webhooks.controller.ts`).

#### Criterios de validación

- [ ] La app en producción se sirve solo por HTTPS.
- [ ] El certificado es válido y no está vencido.
- [ ] La DB tiene cifrado en reposo (según proveedor).
- [ ] S3 tiene cifrado habilitado en el bucket.
- [ ] Las credenciales de Wompi están cifradas en la DB.
- [ ] No hay credenciales en logs ni en respuestas API.
- [ ] La clave maestra de cifrado está en variable de entorno y no en el código.

#### Referencias

- `investigacionImplementacionDeSeguridadDeLaApp.md` – Cifrado
- `WOMPI_POR_JUNTA_DOC.md` – Credenciales por junta
- AWS S3 encryption, PostgreSQL encryption

---

### 7.4 Política de retención de datos

#### Contexto

Definir cuánto tiempo se conservan los datos y qué pasa al final del periodo. Importante para privacidad y cumplimiento.

#### Qué implementar

- [ ] **Documentar política**
  - Datos operativos (pagos, cartas, usuarios): retención X años (ej. 5 para auditoría legal).
  - Datos de facturación: retención según obligaciones tributarias (ej. 5 años en Colombia).
  - Logs de auditoría: retención X años.
  - Backups: retención según política de backups (§2.2).
  - Después del periodo: anonimización o borrado seguro.

- [ ] **Implementación**
  - Jobs periódicos para archivar o eliminar datos según política.
  - O proceso manual documentado si el volumen es bajo.
  - No borrar datos que deban conservarse por ley.

- [ ] **Comunicación**
  - Incluir en política de privacidad.
  - Al cancelar suscripción: informar retención y fecha de borrado.

#### Criterios de validación

- [ ] La política está documentada y es coherente con la ley aplicable.
- [ ] Existe un proceso (manual o automático) para aplicar la retención.
- [ ] Los datos críticos (pagos, facturas) no se borran antes del periodo legal.
- [ ] La política de privacidad menciona la retención.
- [ ] Se documenta qué datos se borran, cuándo y cómo.

#### Referencias

- Ley 1581 de 2012 (Colombia) – Retención
- Obligaciones tributarias – Facturas
- **`docs/legal/INVENTARIO_DOCUMENTACION_LEGAL_OBLIGATORIA.md`** §1.4 – Política de retención
- `plan.md` – Auditoría

---

## 8. Orden de implementación recomendado

_Estado actualizado: 2026-02-25_

### Fase A – Crítico ✅ COMPLETADO

| Orden | Ítem | Estado |
|-------|-----|--------|
| 1 | 2.2 Backups | ✅ `scripts/backup-db.sh` |
| 2 | 2.5 Gestión de secretos | ✅ `.env.example` + `validateEnv()` |
| 3 | 4.1 Servicio de email | ✅ Mailgun – `infrastructure/email/` |

### Fase B – Alto impacto operativo ✅ COMPLETADO

| Orden | Ítem | Estado |
|-------|-----|--------|
| 4 | 2.1 Docker y deploy | ✅ Docker + Caddy HTTPS |
| 5 | 2.4 Health checks | ✅ `/health/live` + `/health/ready` |
| 6 | 4.2 Notificaciones por evento | ✅ factura, vencimiento, pago confirmado |
| 7 | 6.1 Términos de servicio | ✅ `/terminos`, checkbox junta-form, terminosAceptadosEn |
| 8 | 6.2 Política de privacidad | ✅ `/privacidad`, checkboxes junta-form y usuario-form |

### Fase C – Mejora continua ✅ MAYORMENTE COMPLETADO

| Orden | Ítem | Estado |
|-------|-----|--------|
| 9 | 2.6 Logs estructurados | ✅ `ProdLogger` JSON en `main.ts` |
| 10 | 2.7 Monitoreo y alertas | ✅ Uptime Kuma en `docker-compose.monitoring.yml` |
| 11 | 3.1 Unificación overrides | ✅ Dialog eliminado; solo modelo automático |
| 12 | 3.3 Flujo de cancelación | ✅ plan-suscripcion – botón, confirmación, cancelacionSolicitada |
| 13 | 5.1 Onboarding | ⚠️ Banners dashboard OK; checklist completo pendiente |
| 14 | 2.3 CI/CD | ❌ Pendiente |

### Fase D – Refinamiento

| Orden | Ítem | Estado |
|-------|-----|--------|
| 15 | 3.2 Portal de facturación | ✅ Listado, detalle, comprobante HTML imprimible/PDF |
| 16 | 5.3 Estado de cuenta | ✅ Barras de uso en `plan-suscripcion.component` |
| 17 | 6.3 Política de cancelación | ✅ `/legal/cancelacion`, mensaje en plan-suscripcion |
| 18 | 6.4 Facturación electrónica | ❌ Pendiente (evaluar obligación) |
| 19 | 7.1 2FA | ❌ Pendiente |
| 20 | 7.2 Auditoría de accesos | ✅ Login, impersonación y CAMBIO_ROL |
| 21 | 7.3 Cifrado | ✅ AES-256-GCM Wompi keys; S3/disco a verificar en prod |
| 22 | 7.4 Retención de datos | ❌ Pendiente (política a documentar) |

---

## Anexo: Checklist rápido por área

### Infraestructura
- [x] Docker + docker-compose
- [x] Backups automáticos
- [ ] CI/CD
- [x] Health checks (live/ready)
- [x] Secretos fuera del repo
- [x] Logs estructurados
- [x] Monitoreo y alertas

### Modelo de negocio
- [x] Overrides solo automáticos
- [x] Portal de facturación completo
- [x] Flujo de cancelación

### Comunicación
- [x] Servicio de email (Mailgun)
- [x] Notificaciones por evento
- [ ] Avisos in-app (opcional)

### Experiencia
- [ ] Onboarding (parcial: banners)
- [x] Auto-servicio datos de contacto
- [x] Estado de cuenta y proyección

### Legal
- [x] Términos de servicio
- [x] Política de privacidad
- [x] Política de cancelación
- [ ] Facturación electrónica (si aplica)

### Seguridad
- [ ] 2FA
- [x] Auditoría de accesos (login, impersonación, cambio de rol)
- [x] Cifrado en reposo (Wompi) y tránsito (HTTPS)
- [ ] Política de retención

---

**Documento vivo:** Actualizar este checklist a medida que se implementen los ítems y se descubran nuevos requisitos. La versión y fecha deben reflejar los cambios.
