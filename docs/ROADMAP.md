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
| Requisitos adicionales (agua, basura, etc.) | ✔ | `flujoRequisitosAdicionales.md` |
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
- [ ] Inicializar proyecto Angular en `apps/frontend`
- [ ] Configurar Prisma en backend
- [ ] Configurar Angular Material + Tailwind en frontend
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

- [x] Tipos TypeScript para: `DebtResult`, `DebtMonthDetail`, parámetros de `DebtService`, `PaymentService`, `LetterService`, `RequisitoService`, `AuditService`.
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
| 4 | **RequisitoService** | Cambio estado/obligación por requisito + historial; job mensual día 1 (MORA) | Prisma, AuditService |
| 5 | **LetterService** | Validar requisitos (deuda=0, requisitos adicionales, pago carta) y emitir carta (consecutivo, QR, PDF) | DebtService, RequisitoService, AuditService, Consecutivo |

**Entregables por servicio:**

- [ ] **DebtService:** `calculateUserDebt(usuarioId, fechaCorte?)`; sin escritura; errores explícitos si falta historial/tarifa.
- [ ] **AuditService:** `registerEvent({ juntaId, entidad, entidadId, accion, metadata, ejecutadoPorId })`.
- [ ] **PaymentService:** `registerJuntaPayment(...)`; recibe solo método y referencia externa; monto = deuda calculada dentro de transacción; `referenciaExterna` para idempotencia.
- [ ] **RequisitoService:** `updateEstadoRequisito`, `updateObligacionRequisito`, `applyMonthlyCutoff(juntaId?)`; historial en toda modificación.
- [ ] **LetterService:** `emitLetter(cartaId, emitidaPorId)`; validaciones dentro de transacción; consecutivo anual; generación `qrToken` y PDF.

**Reglas técnicas:**

- Transacciones Prisma con `isolationLevel: 'Serializable'` donde aplique (pagos).
- Recalcular deuda **dentro** de la transacción de pago (no fuera).
- Ningún servicio lanza `HttpException` ni conoce `Request`/`Response`.

**Referencias:** `definicionDomainServices.md`, `calculadoraDeDeuda.md`, `flujoDePagosCondicionDeCarrera.md`, `flujoRequisitosAdicionales.md`, `flujoSolicitudCarta.md`, `validacionesDeCartaQR.md`.

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

- [x] `GET /usuarios/:id/deuda` (o `/deuda/detalle`) → llama `DebtService.calculateUserDebt`.
- [x] Respuesta: `total` y opcionalmente `detalle` por mes.
- [x] Filtro por `juntaId` y que el usuario pertenezca a la junta del token.
- [x] Sin almacenar resultado; solo cálculo bajo demanda.

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

## Fase 6 – Requisitos adicionales dinámicos ✅

**Objetivo:** Sistema de requisitos configurables por junta (agua, basura, etc.); estado y obligación; historial; corte automático día 1 para requisitos con `tieneCorteAutomatico=true`.

- [x] Modelo: `RequisitoTipo`, `EstadoRequisito`, `HistorialRequisito`; migración desde EstadoAgua/HistorialAgua.
- [x] `POST /usuarios/:id/requisitos/:requisitoTipoId/estado` (body: `{ estado: "AL_DIA" }`): modificador o ADMIN; actualizar estado + historial.
- [x] `PATCH /usuarios/:id/requisitos/:requisitoTipoId/obligacion` (body: `{ obligacionActiva: false }`): solo ADMIN.
- [x] CRUD RequisitoTipo: `GET /requisitos`, `POST /requisitos`, `PATCH /requisitos/:id` (solo ADMIN).
- [x] Cron día 1: iterar RequisitoTipo con `tieneCorteAutomatico=true`; aplicar MORA a usuarios con `obligacionActiva=true` y `estado=AL_DIA`.
- [x] LetterService: validar `getRequisitosParaCarta`; todos los requisitos activos con `obligacionActiva=true` deben estar AL_DIA.
- [x] Consultas siempre filtradas por junta.

**Referencia:** `flujoRequisitosAdicionales.md`, `definicionDomainServices.md`.

---

## Fase 7 – Módulo cartas ✅

**Objetivo:** Solicitud, validación, emisión con PDF y QR verificable.

- [x] `GET /usuarios/:id/estado-general`: deuda junta (calculada), requisitos adicionales (estado por RequisitoTipo), existencia pago tipo CARTA (sin almacenar estado).
- [x] `POST /documentos`: subida a S3; registro con `juntaId`; estado pendiente/validado según flujo.
- [x] `GET /usuarios/:id/documentos`: listar documentos del usuario (flujoDocumentos).
- [x] `POST /pagos` tipo CARTA (efectivo/online según flujo).
- [x] `POST /cartas/solicitar`: crear carta en estado PENDIENTE; sin PDF aún.
- [x] `POST /cartas/:id/validar`: validar deuda=0, requisitos adicionales al día (o exento), pago carta; si OK: consecutivo anual, generar `qrToken`, PDF, guardar en S3; actualizar carta APROBADA; auditoría.
- [x] Endpoint público `GET /public/validar-carta/:qrToken`: verificar carta; respuesta pública (válida/nombre/documento parcial/fecha/junta); auditoría de consulta.
- [x] QR: solo identificador + validación en backend; sin datos sensibles en el código QR.

**Referencias:** `flujoSolicitudCarta.md`, `validacionesDeCartaQR.md`, `definicionDomainServices.md` (LetterService).

---

## Fase 8 – Auditoría y seguridad reforzada ✅

**Objetivo:** Trazabilidad completa y medidas de seguridad explícitas.

- [x] Auditoría de acciones críticas: pago, carta, requisito, historial laboral (registradas en servicios/transacciones).
- [x] Auditoría de login exitoso (usuarios con juntaId).
- [x] Estructura de auditoría: `juntaId`, `entidad`, `entidadId`, `accion`, `metadata`, `ejecutadoPorId`, `fecha`.
- [ ] (Opcional) Hash encadenado en eventos de auditoría para anti-manipulación.
- [x] Rate limiting: global 60/min; login 5/min; pagos 20/min; validar-carta 30/min; webhooks excluidos.
- [x] Validación HMAC en webhook Wompi.
- [x] Políticas de inmutabilidad documentadas en `politicasInmutabilidad.md`.

**Referencias:** `plan.md`, `investigacionImplementacionDeSeguridadDeLaApp.md`, `00_ARQUITECTURA_RECTOR copy.md`, `politicasInmutabilidad.md`.

---

## Fase 9 – Frontend administrativo (Angular)

**Objetivo:** Gestión por secretaría, tesorería, modificadores de requisitos, admin; y panel de Platform Admin.

**Stack:** Angular 19+, Angular Material, Tailwind CSS, HttpClient. Referencia: `ARQUITECTURA_FRONTEND_ANGULAR.md`.

### 9.0 Cimiento del Frontend Angular

- [ ] Proyecto Angular en `apps/frontend`.
- [ ] Angular Material + Tailwind configurados.
- [ ] AuthService, AuthGuard, JWT Interceptor, login funcional.
- [ ] Layout base (toolbar, sidenav según rol).
- [ ] Variables de entorno: `apiUrl`.

### 9.1 Panel de Platform Admin (prioritario para multi-tenant)

- [ ] Ruta `/platform` en la misma app Angular; guard que exige rol PLATFORM_ADMIN.
- [ ] Login: mismo auth; si usuario tiene PLATFORM_ADMIN y juntaId null, puede acceder a `/platform`.
- [ ] Listado de juntas: tabla Material (nombre, NIT, monto carta, fecha creación); acciones Ver / Editar.
- [ ] Crear junta: formulario (nombre, NIT, monto carta, datos admin inicial); POST /api/platform/juntas; mostrar credenciales temporales al crear.
- [ ] Detalle/edición de junta: ver y editar datos básicos (nombre, NIT, monto carta).
- [ ] (Opcional) Resumen por junta: cifras básicas (usuarios, pagos recientes).

### 9.2 Módulo Usuarios y Deuda

- [ ] Listado usuarios, crear/editar, historial laboral, consulta deuda, tarifas.

### 9.3 Módulo Pagos

- [ ] Registro pago efectivo JUNTA/CARTA; intención pago online; verificación retorno.

### 9.4 Requisitos Adicionales

- [ ] CRUD RequisitoTipo; cambio estado/obligación por usuario.

### 9.5 Módulo Cartas y Documentos

- [ ] Estado general, subida documentos, solicitar carta, validar carta, descargar PDF.

### 9.6 Reglas transversales

- [ ] Todas las llamadas con JWT; nunca enviar `juntaId` en body; backend impone junta desde token.
- [ ] No enviar montos de pago desde frontend para JUNTA; solo disparar intención o registro asistido.

---

## Fase 10 – Frontend usuario (autogestión)

**Objetivo:** Consulta deuda, pago online, solicitud de carta (flujo digital). Misma app Angular.

- [ ] Consulta deuda propia; botón “Pagar ahora” que llama a intención de pago (monto fijado por backend).
- [ ] Subida de documento (recibo requisito, ej. agua); solicitud de carta; seguimiento estado.
- [ ] Mismo backend que flujo presencial; solo cambia quién ejecuta las acciones (usuario vs personal).

**Referencia:** `flujoSolicitudCarta.md`, `flujoDePagos.md`, `ARQUITECTURA_FRONTEND_ANGULAR.md`.

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
- [ ] Cron para: corte de requisitos día 1; job de reconciliación Wompi.
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
Fase 6 (Requisitos) ──┘
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
- **Fase 6:** Requisitos adicionales dinámicos; cambio manual de estado/obligación; job día 1 ejecutado sin errores.
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
| **Frontend Angular** | `ARQUITECTURA_FRONTEND_ANGULAR.md`, `PALETA_COLORES_JAC.md` |
| Multi-tenant y seguridad base | `00_ARQUITECTURA_RECTOR.md`, `00_ARQUITECTURA_RECTOR copy.md` |
| Schema | `SCHEMA BASE v1.md` |
| Deuda | `calculadoraDeDeuda.md` |
| Pagos | `flujoDePagos.md`, `flujoDePagosCasoFallaWebhook.md`, `flujoDePagosCondicionDeCarrera.md` |
| Requisitos adicionales | `flujoRequisitosAdicionales.md` |
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
