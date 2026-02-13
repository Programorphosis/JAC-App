# Roadmap de Desarrollo – Sistema JAC

**Versión:** 1.0  
**Base:** Plan integral, arquitectura rectora, documentos de flujo y dominio.  
**Principio:** Estabilidad → Trazabilidad → Automatización → Escalabilidad.

---

## Resumen ejecutivo

| Estado global        | Descripción |
|---------------------|-------------|
| ✔ Planeación        | Funcional y arquitectónica cerrada |
| ✔ Modelo ER         | Definido y alineado a SCHEMA BASE v1 |
| ✔ Principios        | Auditoría, consecutivos, multi-tenant |
| ⏳ Backend          | En fase estructural |
| ⏳ Prisma           | Congelado estructuralmente |

El roadmap está ordenado por dependencias. No se debe avanzar de fase sin confirmación explícita (según chatmode del proyecto) y una evaluacion minuciosa de lo creado con el fin de evitar el maximo posible de retrabajo o posibles errores o incongruencias con el modelo de negocio o los fines de el projecto, esta evaluacion como el desarrollo debe basarse en la documentacion.

---

## Fase 0 – Cimiento (cerrado)

**Objetivo:** Documentación y reglas formales.

| Entregable | Estado | Documento de referencia |
|------------|--------|-------------------------|
| Plan integral del sistema | ✔ | `plan.md` |
| Arquitectura rectora multi-tenant | ✔ | `00_ARQUITECTURA_RECTOR.md`, `00_ARQUITECTURA_RECTOR copy.md` |
| Modelo de datos (ER) | ✔ | `SCHEMA BASE v1.md` |
| Cálculo de deuda (especificación) | ✔ | `calculadoraDeDeuda.md` |
| Flujo de pagos (efectivo/online) | ✔ | `flujoDePagos.md` |
| Caso falla webhook + reconciliación | ✔ | `flujoDePagosCasoFallaWebhook.md` |
| Condición de carrera (doble pago) | ✔ | `flujoDePagosCondicionDeCarrera.md` |
| Módulo agua (receptor + cron) | ✔ | `flujoReceptorDeAgua.md` |
| Flujo solicitud/validación carta | ✔ | `flujoSolicitudCarta.md` |
| Validación QR cartas | ✔ | `validacionesDeCartaQR.md` |
| Domain services (contratos) | ✔ | `definicionDomainServices.md` |
| Seguridad (investigación) | ✔ | `investigacionImplementacionDeSeguridadDeLaApp.md` |
| Chatmode desarrollo | ✔ | `chatModeCursor.md` |
| Configuración infraestructura | ✔ | `configuracionInfraestructura.md` |
| Convenciones API | ✔ | `convencionesAPI.md` |
| Flujo documentos (upload) | ✔ | `flujoDocumentos.md` |
| Consecutivos y cron jobs | ✔ | `consecutivosYCronJobs.md` |
| Bootstrap y onboarding | ✔ | `flujoBootstrapYOnboarding.md` |

**Criterio de cierre:** Todas las reglas inmutables y flujos críticos están escritos y alineados entre documentos.

---

## Fase 0.5 – Configuración Inicial del Monorepo (antes de Fase 1)

**Objetivo:** Estructurar monorepo, configurar Docker para desarrollo local antes de iniciar desarrollo.

**⚠️ ENFOQUE:** Desarrollo local únicamente. Staging y producción se configurarán más adelante cuando se despliegue en VPS.

### 0.5.1 Estructura del Monorepo

- [ ] Crear estructura de carpetas (`apps/backend`, `apps/frontend`, `docker/`)
- [ ] Inicializar workspace root con `package.json`
- [ ] Configurar `.gitignore` (excluir `.env`, `node_modules`, `dist`, etc.)

### 0.5.2 Configuración Docker (Desarrollo Local)

- [ ] Crear Dockerfile para backend (multi-stage: dev, build, production)
- [ ] Crear Dockerfile para frontend (multi-stage: dev, build, production)
- [ ] Configurar `docker-compose.yml` para desarrollo local
- [ ] Crear script de inicialización de DB (`init-db.sh`)
- [ ] **Nota:** Configuraciones de staging/producción ya documentadas en `configuracionInfraestructura.md` para futuro despliegue

### 0.5.3 Configuración Nginx (FUTURO)

- [ ] **Nota:** Nginx no es necesario para desarrollo local (backend y frontend corren directamente)
- [ ] Configuraciones de Nginx para staging/producción ya documentadas en `configuracionInfraestructura.md`
- [ ] Se configurarán cuando se despliegue en VPS

### 0.5.4 Variables de Entorno

- [ ] Crear `.env.example` para backend con todas las variables necesarias
- [ ] Crear `.env.example` para frontend
- [ ] Crear `.env.development`, `.env.staging`, `.env.production` (sin valores sensibles)
- [ ] Documentar qué variables son secretas y cómo gestionarlas

### 0.5.5 Inicialización de Proyectos

- [ ] Inicializar proyecto NestJS en `apps/backend`
- [ ] Inicializar proyecto React + Vite en `apps/frontend`
- [ ] Configurar Prisma en backend
- [ ] Configurar Tailwind en frontend
- [ ] Configurar scripts de build y start en ambos proyectos

### 0.5.6 Base de Datos

- [ ] Configurar conexión PostgreSQL desde Docker
- [ ] Crear script de inicialización de base de datos
- [ ] Configurar migraciones de Prisma
- [ ] Configurar script de backup automático

### 0.5.7 Health Checks y Logs

- [ ] Implementar endpoint `/health` en backend
- [ ] Configurar health checks en docker-compose
- [ ] Configurar logs por servicio
- [ ] Configurar rotación de logs (opcional)

### 0.5.8 Scripts de Utilidad

- [ ] Crear scripts npm en root para: `dev`, `stage:up`, `prod:up`, `backup`, `migrate`
- [ ] Documentar comandos básicos de Docker
- [ ] Crear README con instrucciones de setup

### 0.5.9 Bootstrap y Platform Admin

- [ ] Migración: roles base (PLATFORM_ADMIN, ADMIN, SECRETARIA, TESORERA, RECEPTOR_AGUA, CIUDADANO); `Usuario.juntaId` opcional
- [ ] Servicio `JuntaService.createJunta(...)` reutilizable (Application layer)
- [ ] Endpoint `POST /api/bootstrap` (crea platform admin + primera junta; solo si no hay juntas)
- [ ] Endpoints protegidos: GET/POST/PATCH `/api/platform/juntas`, GET `/api/platform/juntas/:id`
- [ ] Guard: rutas `/api/platform/*` solo con rol PLATFORM_ADMIN
- [ ] Generación de contraseñas temporales seguras; auditoría de creación/edición de juntas
- [ ] (Opcional) Script CLI `seed:create-junta` como respaldo

**Criterio de cierre:** Monorepo estructurado, Docker funcionando en desarrollo local, base de datos PostgreSQL conectada, proyectos backend y frontend inicializados. Bootstrap crea platform admin y primera junta; endpoints de plataforma protegidos.

**Referencias:**
- `SETUP_DESARROLLO_LOCAL.md` - Guía rápida de setup para desarrollo
- `configuracionInfraestructura.md` - Configuración completa (staging/producción para futuro)

---

## Fase 1 – Modelo de datos, contratos y bootstrap

**Objetivo:** Prisma estable, contratos de dominio definidos, y sistema inicializable.

### 1.1 Schema Prisma (congelado)

- [x] Revisar `SCHEMA BASE v1.md` vs implementación actual.
- [x] Asegurar en `Pago`: `referenciaExterna String? @unique` (idempotencia pagos online).
- [x] Índices: `@@index([juntaId])` y compuestos donde aplique en todas las tablas multi-tenant.
- [x] Migraciones aplicadas y documentadas.
- [ ] **Criterio:** Ninguna consulta sin `juntaId`; modelo alineado 100% al documento.

**Referencias:** `00_ARQUITECTURA_RECTOR copy.md`, `flujoDePagosCondicionDeCarrera.md`, `SCHEMA BASE v1.md`.

### 1.2 Contratos de dominio

- [x] Tipos TypeScript para: `DebtResult`, `DebtMonthDetail`, parámetros de `DebtService`, `PaymentService`, `LetterService`, `WaterService`, `AuditService`.
- [ ] Interfaces de repositorio (abstracción sobre Prisma) si se adopta en esta fase.
- [x] **Criterio:** Domain layer no depende de Nest ni HTTP; solo tipos y errores de dominio.

**Referencia:** `definicionDomainServices.md`.

### 1.3 Bootstrap y Platform Admin

- [ ] Migración: roles base (incl. PLATFORM_ADMIN); `Usuario.juntaId` opcional.
- [ ] Servicio `JuntaService.createJunta(...)` en Application layer (reutilizable).
- [ ] Endpoint `POST /api/bootstrap` (crea platform admin + primera junta; solo si no hay juntas).
- [ ] Endpoints `/api/platform/juntas`: GET (listar), GET/:id (detalle), POST (crear), PATCH/:id (edición básica).
- [ ] Guard para PLATFORM_ADMIN en rutas de plataforma.
- [ ] Generación de contraseñas temporales seguras; auditoría.
- [ ] **Criterio:** Bootstrap funciona; creación de nuevas juntas vía API protegida por platform admin.

**Referencia:** `flujoBootstrapYOnboarding.md`.

---

## Fase 2 – Domain Layer (núcleo)

**Objetivo:** Servicios de dominio puros, determinísticos y auditables.

Orden recomendado:

| Orden | Servicio | Responsabilidad principal | Dependencias |
|-------|----------|----------------------------|--------------|
| 1 | **DebtService** | Calcular deuda bajo demanda (último pago → meses → estado laboral → tarifa) | Prisma (lectura), tarifas, historial_laboral, pagos |
| 2 | **AuditService** | Registrar eventos en tabla `Auditoria` | Prisma (escritura) |
| 3 | **PaymentService** | Registrar pago JUNTA validando monto = deuda calculada; transacción serializable | DebtService, AuditService |
| 4 | **WaterService** | Cambio estado/obligación agua + historial; job mensual día 1 (MORA) | Prisma, AuditService |
| 5 | **LetterService** | Validar requisitos (deuda=0, agua, pago carta) y emitir carta (consecutivo, QR, PDF) | DebtService, WaterService, AuditService, Consecutivo |

**Entregables por servicio:**

- [ ] **DebtService:** `calculateUserDebt(usuarioId, fechaCorte?)`; sin escritura; errores explícitos si falta historial/tarifa.
- [ ] **AuditService:** `registerEvent({ juntaId, entidad, entidadId, accion, metadata, ejecutadoPorId })`.
- [ ] **PaymentService:** `registerJuntaPayment(...)`; recibe solo método y referencia externa; monto = deuda calculada dentro de transacción; `referenciaExterna` para idempotencia.
- [ ] **WaterService:** `updateWaterStatus`, `updateWaterObligation`, `applyMonthlyWaterCutoff(juntaId)`; historial en toda modificación.
- [ ] **LetterService:** `emitLetter(cartaId, emitidaPorId)`; validaciones dentro de transacción; consecutivo anual; generación `qrToken` y PDF.

**Reglas técnicas:**

- Transacciones Prisma con `isolationLevel: 'Serializable'` donde aplique (pagos).
- Recalcular deuda **dentro** de la transacción de pago (no fuera).
- Ningún servicio lanza `HttpException` ni conoce `Request`/`Response`.

**Referencias:** `definicionDomainServices.md`, `calculadoraDeDeuda.md`, `flujoDePagosCondicionDeCarrera.md`, `flujoReceptorDeAgua.md`, `flujoSolicitudCarta.md`, `validacionesDeCartaQR.md`.

---

## Fase 3 – Application Layer e infraestructura base

**Objetivo:** Casos de uso que orquestan dominio, auth y multi-tenant.

### 3.1 Autenticación y autorización

- [ ] JWT con `userId`, `juntaId` (null para Platform Admin), `roles` (nunca `juntaId` desde frontend).
- [ ] Refresh token rotativo; revocación en DB si se define.
- [ ] Guards por rol: PLATFORM_ADMIN (solo /api/platform/*), ADMIN, SECRETARIA, TESORERA, RECEPTOR_AGUA, CIUDADANO (operaciones acotadas por junta).
- [ ] Middleware: extraer `juntaId` del token; operaciones de junta exigen juntaId; platform admin solo en rutas de plataforma.

**Referencias:** `00_ARQUITECTURA_RECTOR copy.md`, `investigacionImplementacionDeSeguridadDeLaApp.md`.

### 3.2 Módulos Application (orden sugerido)

- [ ] **users:** CRUD usuarios (solo ADMIN/SECRETARIA); carga inicial; filtro por `juntaId`.
- [ ] **historial_laboral:** Alta de registros (sin editar históricos); usado por DebtService.
- [ ] **tarifas:** Alta/consulta tarifas versionadas por junta y fecha.
- [ ] **auth:** Login, refresh, permisos.

Cada módulo: DTO → validación → llamada a Domain/Prisma → auditoría cuando corresponda.

---

## Fase 4 – Módulo deuda y consultas

**Objetivo:** Exponer cálculo de deuda de forma segura.

- [ ] `GET /usuarios/:id/deuda` (o `/deuda/detalle`) → llama `DebtService.calculateUserDebt`.
- [ ] Respuesta: `total` y opcionalmente `detalle` por mes.
- [ ] Filtro por `juntaId` y que el usuario pertenezca a la junta del token.
- [ ] Sin almacenar resultado; solo cálculo bajo demanda.

**Referencia:** `calculadoraDeDeuda.md`, `flujoDePagos.md`.

---

## Fase 5 – Módulo pagos

**Objetivo:** Pagos totales (efectivo y online) con integridad y sin doble registro.

### 5.1 Pago efectivo

- [ ] `POST /pagos` (tipo JUNTA, método EFECTIVO): body con `usuarioId`; backend calcula deuda y exige monto exacto; transacción serializable; auditoría.
- [ ] Validación: monto = deuda calculada **dentro** de la transacción.

### 5.2 Pago online (Wompi)

- [ ] `POST /pagos/online/intencion`: recalcular deuda; crear intención en Wompi con monto exacto; guardar referencia temporal (pendiente).
- [ ] Webhook `POST /webhooks/wompi`: verificar firma; estado APPROVED; monto exacto; llamar **una función única** `registerPaymentFromProvider(transactionData)` (idempotencia por `referenciaExterna`).
- [ ] Endpoint de retorno (redirect): al volver el usuario, consultar transacción en Wompi y, si APPROVED, llamar misma lógica de registro (rescate si falló webhook).
- [ ] Job de reconciliación nocturna: transacciones APPROVED del día en Wompi vs base; registrar faltantes.
- [ ] Transacción serializable + unique en `referenciaExterna` para evitar doble pago y condición de carrera.

**Referencias:** `flujoDePagos.md`, `flujoDePagosCasoFallaWebhook.md`, `flujoDePagosCondicionDeCarrera.md`.

---

## Fase 6 – Módulo agua

**Objetivo:** Estado y obligación de agua; historial; corte automático día 1.

- [ ] `POST /usuarios/:id/agua` (estado AL_DIA): solo RECEPTOR_AGUA; actualizar estado + `HistorialAgua` en transacción; auditoría.
- [ ] `PATCH /usuarios/:id/agua/obligacion`: solo ADMIN; actualizar `obligacionActiva` + historial.
- [ ] Cron día 1: ejecutar `WaterService.applyMonthlyWaterCutoff(juntaId)` (o por todas las juntas); todos los `obligacionActiva=true` y `estado=AL_DIA` → MORA; historial con `cambioAutomatico: true`.
- [ ] Consultas siempre filtradas por junta vía `Usuario.juntaId`.

**Referencia:** `flujoReceptorDeAgua.md`, `definicionDomainServices.md`.

---

## Fase 7 – Módulo cartas

**Objetivo:** Solicitud, validación, emisión con PDF y QR verificable.

- [ ] `GET /usuarios/:id/estado-general`: deuda junta (calculada), estado agua, existencia pago tipo CARTA (sin almacenar estado).
- [ ] `POST /documentos`: subida a S3; registro con `juntaId`; estado pendiente/validado según flujo.
- [ ] `POST /pagos` tipo CARTA (efectivo/online según flujo).
- [ ] `POST /cartas/solicitar`: crear carta en estado PENDIENTE; sin PDF aún.
- [ ] `POST /cartas/:id/validar`: validar deuda=0, agua al día (o exento), pago carta; si OK: consecutivo anual, generar `qrToken`, PDF, guardar en S3; actualizar carta APROBADA; auditoría.
- [ ] Endpoint público `GET /public/validar-carta/:qrToken`: verificar carta; respuesta pública (válida/nombre/documento parcial/fecha/junta); auditoría de consulta.
- [ ] QR: solo identificador + validación en backend; sin datos sensibles en el código QR.

**Referencias:** `flujoSolicitudCarta.md`, `validacionesDeCartaQR.md`, `definicionDomainServices.md` (LetterService).

---

## Fase 8 – Auditoría y seguridad reforzada

**Objetivo:** Trazabilidad completa y medidas de seguridad explícitas.

- [ ] Interceptor global NestJS: registrar en tabla `Auditoria` las acciones críticas (pago, carta, cambio agua, cambio historial laboral, etc.).
- [ ] Estructura de auditoría: `juntaId`, `entidad`, `entidadId`, `accion`, `metadata`, `ejecutadoPorId`, `fecha`.
- [ ] (Opcional) Hash encadenado en eventos de auditoría para anti-manipulación.
- [ ] Rate limiting en login y en endpoints de pago.
- [ ] Validación HMAC en webhook Wompi.
- [ ] Políticas de inmutabilidad: no UPDATE/DELETE en tablas críticas (pagos, historial_laboral, auditoría); correcciones vía nuevo registro si se define así.

**Referencias:** `plan.md`, `investigacionImplementacionDeSeguridadDeLaApp.md`, `00_ARQUITECTURA_RECTOR copy.md`.

---

## Fase 9 – Frontend administrativo

**Objetivo:** Gestión por secretaría, tesorería, receptor de agua, admin; y panel de Platform Admin.

### 9.1 Panel de Platform Admin (prioritario para multi-tenant)

- [ ] Ruta `/platform` en la misma app React; guard que exige rol PLATFORM_ADMIN.
- [ ] Login: mismo auth; si usuario tiene PLATFORM_ADMIN y juntaId null, puede acceder a `/platform`.
- [ ] Listado de juntas: tabla (nombre, NIT, monto carta, fecha creación); acciones Ver / Editar.
- [ ] Crear junta: formulario (nombre, NIT, monto carta, datos admin inicial); POST /api/platform/juntas; mostrar credenciales temporales al crear.
- [ ] Detalle/edición de junta: ver y editar datos básicos (nombre, NIT, monto carta).
- [ ] (Opcional) Resumen por junta: cifras básicas (usuarios, pagos recientes).

### 9.2 Frontend por junta (admin, secretaría, tesorería, receptor, ciudadano)

- [ ] Stack: React (Vite), Tailwind, Axios; sin TypeScript en MVP si está definido.
- [ ] Vistas (según plan): usuarios, historial laboral, tarifas, consulta deuda, registro pagos efectivo, estado agua, solicitudes de carta, validación de cartas, documentos.
- [ ] Todas las llamadas con JWT; nunca enviar `juntaId` en body; backend impone junta desde token.
- [ ] No enviar montos de pago desde frontend para JUNTA; solo disparar intención o registro asistido.

---

## Fase 10 – Frontend usuario (autogestión)

**Objetivo:** Consulta deuda, pago online, solicitud de carta (flujo digital).

- [ ] Consulta deuda; botón “Pagar ahora” que llama a intención de pago (monto fijado por backend).
- [ ] Subida de documento (recibo agua); solicitud de carta; seguimiento estado.
- [ ] Mismo backend que flujo presencial; solo cambia quién ejecuta las acciones.

**Referencia:** `flujoSolicitudCarta.md`, `flujoDePagos.md`.

---

## Fase 11 – Integración Wompi completa y resiliencia

**Objetivo:** Pagos online robustos y reconciliación.

- [ ] Flujo completo: intención → redirect Wompi → retorno → verificación en API Wompi → registro con `registerPaymentFromProvider`.
- [ ] Webhook idempotente; reintentos manejados.
- [ ] Job de reconciliación (diario): comparar APPROVED en Wompi vs `pagos`; insertar faltantes con misma función de registro.
- [ ] Pruebas: doble intención, webhook duplicado, fallo de webhook + rescate por retorno.

**Referencias:** `flujoDePagosCasoFallaWebhook.md`, `flujoDePagosCondicionDeCarrera.md`.

---

## Fase 12 – Deploy e infraestructura

**Objetivo:** Entorno estable y auditable.

- [ ] VPS Linux; Nginx; PM2 (o similar); HTTPS obligatorio.
- [ ] PostgreSQL: backups diarios; WAL si se requiere; sin exponer DB a internet.
- [ ] Variables de entorno y secretos fuera del repositorio.
- [ ] Cron para: corte de agua día 1; job de reconciliación Wompi.
- [ ] Logs y retención según política de auditoría.

**Referencia:** `plan.md`, `investigacionImplementacionDeSeguridadDeLaApp.md`.

---

## Matriz de dependencias (resumen)

```
Fase 0 (doc) → Fase 1 (Prisma + contratos) → Fase 2 (Domain)
                                                      ↓
Fase 3 (Auth + Application base) ←────────────────────┘
         ↓
Fase 4 (Deuda) → Fase 5 (Pagos) ──→ Fase 11 (Wompi completo)
         ↓
Fase 6 (Agua) ──┘
         ↓
Fase 7 (Cartas) → Fase 8 (Auditoría + seguridad)
         ↓
Fase 9 (Front admin) → Fase 10 (Front usuario)
         ↓
Fase 12 (Deploy)
```

---

## Criterios de “listo” por fase

- **Fase 1:** Schema Prisma estable, migraciones aplicadas, contratos de dominio definidos.
- **Fase 2:** Tests o validación manual de cada Domain Service según especificación; sin dependencias HTTP.
- **Fase 3:** Login/refresh y al menos un módulo (ej. usuarios) funcionando con guards y `juntaId`.
- **Fase 4:** Endpoint deuda devuelve total (y detalle) coherente con `calculadoraDeDeuda.md`.
- **Fase 5:** Pago efectivo registrado con transacción serializable; flujo online con webhook + retorno + idempotencia.
- **Fase 6:** Cambio manual de estado/obligación y job día 1 ejecutado sin errores.
- **Fase 7:** Carta emitida solo con requisitos cumplidos; QR validado en endpoint público.
- **Fase 8:** Acciones críticas visibles en tabla Auditoría; rate limit y HMAC activos.
- **Fases 9–10:** Flujos presencial y digital usables end-to-end.
- **Fase 11:** Reconciliación ejecutada al menos una vez sin duplicados.
- **Fase 12:** App accesible por HTTPS; cron y backups operando.

---

## Documentos de referencia rápida

| Tema | Documento |
|------|-----------|
| Plan general | `plan.md` |
| Multi-tenant y seguridad base | `00_ARQUITECTURA_RECTOR.md`, `00_ARQUITECTURA_RECTOR copy.md` |
| Schema | `SCHEMA BASE v1.md` |
| Deuda | `calculadoraDeDeuda.md` |
| Pagos | `flujoDePagos.md`, `flujoDePagosCasoFallaWebhook.md`, `flujoDePagosCondicionDeCarrera.md` |
| Agua | `flujoReceptorDeAgua.md` |
| Cartas | `flujoSolicitudCarta.md`, `validacionesDeCartaQR.md` |
| Documentos (upload) | `flujoDocumentos.md` |
| Bootstrap y onboarding | `flujoBootstrapYOnboarding.md` |
| API | `convencionesAPI.md` |
| Consecutivos y cron | `consecutivosYCronJobs.md` |
| Dominio | `definicionDomainServices.md` |
| Seguridad | `investigacionImplementacionDeSeguridadDeLaApp.md` |
| Reglas de desarrollo | `chatModeCursor.md` |

---

*Roadmap alineado a la planeación integral del sistema JAC y a la arquitectura rectora. Cualquier cambio de alcance o orden debe reflejarse en este documento y en el chatmode de plan de desarrollo.*
