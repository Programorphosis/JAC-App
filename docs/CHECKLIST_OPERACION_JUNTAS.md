# Checklist Operación de Juntas – JAC App

**Versión:** 1.0  
**Fecha:** 2025-02-18  
**Objetivo:** Documento de referencia detallado para validar y completar la operación diaria de las juntas (usuarios, pagos, cartas, requisitos, documentos, tarifas, historial laboral). Cada punto incluye contexto, criterios de validación y guía de implementación.

**Complementa a:** `CHECKLIST_SAAS_PROFESIONAL.md` (plataforma e infraestructura).

---

## Índice

1. [Introducción y uso del documento](#1-introducción-y-uso-del-documento)
2. [Usuarios y afiliados](#2-usuarios-y-afiliados)
3. [Deuda y tarifas](#3-deuda-y-tarifas)
4. [Pagos](#4-pagos)
5. [Cartas laborales](#5-cartas-laborales)
6. [Requisitos adicionales](#6-requisitos-adicionales)
7. [Documentos](#7-documentos)
8. [Historial laboral](#8-historial-laboral)
9. [Reportes y contabilidad por junta](#9-reportes-y-contabilidad-por-junta)
10. [Cron jobs operativos](#10-cron-jobs-operativos)
11. [Orden de implementación recomendado](#11-orden-de-implementación-recomendado)

---

## 1. Introducción y uso del documento

### 1.1 Propósito

Este documento cubre la **operación interna de cada junta**: lo que hacen ADMIN, SECRETARIA, TESORERA, modificadores y AFILIADOS en su día a día. No cubre la plataforma SaaS (planes, facturación, Platform Admin), que está en `CHECKLIST_SAAS_PROFESIONAL.md`.

### 1.2 Cómo usarlo

1. **Antes de implementar:** Leer la sección completa del ítem.
2. **Durante la implementación:** Seguir la guía técnica y los criterios de validación.
3. **Después de implementar:** Marcar el checkbox `[ ]` → `[x]`.
4. **En code review:** Usar los criterios de validación como checklist.

### 1.3 Estado actual (resumen)

| Área | Estado general | Documentos de referencia |
|------|----------------|--------------------------|
| Usuarios | ✅ CRUD, roles, inactivo bloqueado | `MATRIZ_PERMISOS_ROLES.md` |
| Deuda | ✅ Cálculo dinámico | `calculadoraDeDeuda.md` |
| Tarifas | ✅ Crear, editar (nueva vigente) | `definicionDomainServices.md` |
| Pagos | ✅ Efectivo, transferencia, online, filtros, estadísticas | `flujoDePagos.md` |
| Cartas | ✅ Solicitar, validar, rechazar, autovalidación | `flujoSolicitudCarta.md`, `validacionesDeCartaQR.md` |
| Requisitos | ✅ CRUD, modificador, corte día 1 | `flujoRequisitosAdicionales.md` |
| Documentos | ✅ Subida S3, descarga, límites | `flujoDocumentos.md` |
| Historial laboral | ✅ Crear, cerrar vigente | `definicionDomainServices.md` |
| Reportes junta | ✅ Dashboard contable, filtros pagos | `ROL_TESORERA_FRONTEND.md` |
| Cron operativos | ✅ Requisitos, Wompi | `consecutivosYCronJobs.md` |
| Rol FISCAL | ✅ Implementado (solo lectura) | `DISENO_ROL_FISCAL.md` |

---

## 2. Usuarios y afiliados

### 2.1 CRUD de usuarios

#### Contexto

Cada junta gestiona sus afiliados (usuarios). El ADMIN crea y edita usuarios; la SECRETARIA puede editar datos básicos. Los usuarios tienen documento único por junta (`@@unique([juntaId, numeroDocumento])`).

#### Qué está implementado

- [x] Crear usuario (ADMIN, SECRETARIA según permiso).
- [x] Editar usuario (datos básicos, activo).
- [x] Listar usuarios con filtros.
- [x] Detalle de usuario con tabs (deuda, historial, requisitos, cartas, documentos).
- [x] Historial laboral inicial al crear (desde fechaCreacion, vigente).
- [x] Asignación de roles (ADMIN).
- [x] Unicidad documento por junta en schema.

#### Qué validar o completar

- [x] **Búsqueda/autocomplete en pagos**
  - ROL_TESORERA_FRONTEND indica: "usar búsqueda/autocomplete para encontrar usuarios por nombre, apellido o documento".
  - Implementado: mat-autocomplete con debounce, GET /usuarios?search=..., resultados filtrados.

- [x] **Usuario inactivo (activo=false)** — **IMPLEMENTADO**
  - **Regla:** Usuario inactivo NO puede solicitar carta ni pagar. La deuda se mantiene para auditoría.
  - Implementado: UsuarioInactivoError en cartas, pagos, LetterEmissionRunner. Mensaje explícito en frontend.

- [x] **Dar de baja usuario (soft: activo=false)** — **IMPLEMENTADO** (2026-02-25)
  - Botón "Dar de baja" / "Reactivar" en usuario-detail (solo ADMIN viendo a otro usuario).
  - Confirmación con ConfirmDialog antes de aplicar.
  - Regla: usuario inactivo no puede solicitar carta ni pagar. La deuda se mantiene para auditoría.
  - No hay hard delete; el schema usa `activo` (boolean).

#### Criterios de validación

- [x] No se pueden crear dos usuarios con el mismo documento en la misma junta.
- [x] La búsqueda de usuarios en pagos funciona con nombres y documento.
- [x] La política de usuario inactivo está documentada y es coherente con el código.
- [x] Toda operación de usuario filtra por juntaId (multi-tenant).

#### Referencias

- `apps/backend/src/application/users/`
- `MATRIZ_PERMISOS_ROLES.md`
- `ROL_ADMIN.md`, `ROL_SECRETARIA.md`

---

### 2.2 Bootstrap de datos iniciales al crear junta

#### Contexto

Cuando se crea una junta (Platform Admin o bootstrap), ¿qué datos se inicializan? Tarifas, requisitos, montoCarta, vigenciaCartaMeses.

#### Qué está implementado

- [x] Junta con montoCarta, vigenciaCartaMeses (opcionales).
- [x] Usuario admin inicial con rol ADMIN.
- [x] Suscripción si se especifica plan (con o sin trial).
- [ ] Tarifas iniciales: no se crean automáticamente.
- [ ] Requisitos iniciales: no se crean automáticamente.

#### Qué implementar (opcional)

- [x] **Tarifas por defecto al crear junta** — **IMPLEMENTADO (Opción B)**
  - Mensaje "Configure las tarifas" en dashboard, pagos (tab Registrar), deuda. tieneTarifas en GET /mi-junta.
  - SinTarifaVigenteError con mensaje amigable + enlace a Tarifas.

- [x] **Requisitos por defecto** — **DECISIÓN TOMADA**
  - No crear requisitos al crear junta. El ADMIN los configura según necesidad.

#### Criterios de validación

- [x] Una junta nueva puede operar (o hay mensaje claro de qué configurar primero).
- [x] No hay errores de "sin tarifa vigente" en juntas recién creadas sin configuración explícita (o el mensaje es claro).
- [x] La documentación de onboarding indica los pasos de configuración inicial.

#### Referencias

- `flujoBootstrapYOnboarding.md`
- `JuntaService.createJunta`
- `calculadoraDeDeuda.md` – requiere tarifa vigente

---

## 3. Deuda y tarifas

### 3.1 Cálculo de deuda

#### Contexto

La deuda se calcula dinámicamente: no se guarda. Depende de historial laboral, tarifas vigentes por mes y último pago tipo JUNTA. Referencia: `calculadoraDeDeuda.md`.

#### Qué está implementado

- [x] DebtService en dominio (puro, sin HTTP).
- [x] PrismaDebtDataProvider con historial, pagos, tarifas.
- [x] Endpoint GET /usuarios/:id/deuda y /deuda/detalle.
- [x] Validación: monto debe coincidir exactamente con deuda (no pagos parciales).
- [x] Estado general (deuda, requisitos, pago carta) para validación de carta.
- [x] Errores de dominio: SinHistorialLaboralError, SinTarifaVigenteError, HistorialLaboralSuperpuestoError, DeudaCeroError.

#### Qué validar

- [x] **Mes en curso no se cobra**
  - calculadoraDeDeuda: "fecha_fin_calculo = último día del mes anterior a NOW". Nunca se cobra el mes en curso.
  - Verificar que PrismaDebtDataProvider y DebtService implementen esto correctamente.

- [x] **Tarifa por estado laboral y mes**
  - Para cada mes, se usa el estado laboral vigente en ese mes (historial) y la tarifa con fechaVigencia <= último día del mes, ordenada DESC.
  - Verificar que getTarifaVigente retorne la tarifa correcta para cada (juntaId, estadoLaboral, year, month).

- [x] **Usuario sin historial**
  - Si no hay historial laboral, el cálculo lanza SinHistorialLaboralError. El usuario recién creado tiene historial inicial. Verificar que no haya usuarios sin historial en producción.

#### Criterios de validación

- [x] El detalle de deuda muestra mes a mes con estado laboral y tarifa aplicada.
- [x] El total coincide con la suma del detalle.
- [x] Un pago registrado hace que la deuda pase a 0 (o al siguiente periodo si hay más meses).
- [x] No se puede registrar pago con monto distinto a la deuda calculada.
- [x] Deuda cero rechaza registro de pago con mensaje claro.

#### Referencias

- `calculadoraDeDeuda.md`
- `apps/backend/src/domain/services/debt.service.ts`
- `apps/backend/src/infrastructure/debt/prisma-debt-data-provider.service.ts`

---

### 3.2 Gestión de tarifas

#### Contexto

Las tarifas definen el valor mensual por estado laboral (TRABAJANDO, NO_TRABAJANDO). Tienen fecha de vigencia; el cálculo de deuda usa la tarifa vigente para cada mes.

#### Qué está implementado

- [x] Crear tarifa (TESORERA): POST /tarifas con estadoLaboral, valorMensual, fechaVigencia.
- [x] Listar tarifas: GET /tarifas con filtro opcional por estadoLaboral.
- [x] Auditoría al crear tarifa.
- [x] Editar tarifa: frontend "Editar" crea nueva con fechaVigencia=hoy; la anterior deja de ser vigente para meses futuros.
- [ ] Eliminar tarifa: no existe (inmutabilidad).

#### Qué implementar o documentar

- [x] **Editar tarifa** — **IMPLEMENTADO**
  - Frontend: botón Editar en tarifas vigentes; al guardar crea nueva con fechaVigencia=hoy.
  - La anterior deja de ser vigente para meses futuros (getTarifaVigente usa fechaVigencia DESC).

- [ ] **Eliminar tarifa**
  - No eliminar tarifas. El cálculo de deuda las necesita para meses pasados.
  - Documentar en políticas de inmutabilidad.

- [x] **Validación de solapamiento**
  - ¿Puede haber dos tarifas para el mismo estadoLaboral con la misma fechaVigencia? El índice es (juntaId, estadoLaboral, fechaVigencia). Si hay unique, no. Revisar schema.
  - Para cada mes, debe haber exactamente una tarifa vigente. El getTarifaVigente usa findFirst con ordenación; si hay varias con la misma fecha, podría haber ambigüedad. Documentar o restringir.

#### Criterios de validación

- [x] Solo TESORERA puede crear tarifas.
- [x] Las tarifas se listan ordenadas por fechaVigencia descendente.
- [x] El cálculo de deuda usa la tarifa correcta para cada mes.
- [x] La política de no editar/eliminar está documentada (o implementada si se decide lo contrario).
- [x] Toda operación filtra por juntaId.

#### Referencias

- `apps/backend/src/application/tarifas/`
- `calculadoraDeDeuda.md` §8
- `politicasInmutabilidad.md`

---

## 4. Pagos

### 4.1 Registro de pagos (efectivo, transferencia)

#### Contexto

La TESORERA registra pagos en efectivo o por transferencia. El monto debe coincidir exactamente con la deuda (JUNTA) o con el montoCarta configurado (CARTA). No hay pagos parciales.

#### Qué está implementado

- [x] Registrar pago efectivo JUNTA: valida deuda, monto exacto, transacción.
- [x] Registrar pago efectivo CARTA: valida montoCarta.
- [x] Registrar pago transferencia: con referenciaExterna (número de transferencia).
- [x] Consecutivos por tipo (PAGO_JUNTA, PAGO_CARTA) y año.
- [x] Idempotencia: referenciaExterna unique para evitar duplicados.
- [x] Auditoría en cada registro.
- [x] PaymentService en dominio; PrismaPaymentRegistrationContext.

#### Qué validar

- [x] **referenciaExterna** — **DECISIÓN DOCUMENTADA**
  - **Transferencia:** Número de la transacción/número de transferencia. Obligatorio.
  - **Online (Wompi):** transactionId de Wompi. Idempotencia.
  - **Efectivo:** null por ahora (no hay referencia de entrega del dinero a la junta que se use sistemáticamente).

- [x] **Pago duplicado**
  - Si se intenta registrar con la misma referenciaExterna, debe fallar con PagoDuplicadoError.
  - Verificar que el frontend muestre mensaje claro.

- [x] **Orden de operaciones**
  - Obtener consecutivo y crear pago en la misma transacción para evitar condiciones de carrera.
  - Verificar que PaymentRegistrationRunner use transacción.

#### Criterios de validación

- [x] Solo TESORERA puede registrar pagos efectivo/transferencia.
- [x] El monto de pago JUNTA debe ser exactamente la deuda calculada.
- [x] El monto de pago CARTA debe ser exactamente montoCarta de la junta.
- [x] referenciaExterna en transferencia es obligatoria y única.
- [x] Los consecutivos son correctos y no se repiten.
- [x] Toda operación filtra por juntaId.

#### Referencias

- `flujoDePagos.md`
- `apps/backend/src/application/pagos/`
- `apps/backend/src/domain/services/payment.service.ts`

---

### 4.2 Pagos online (Wompi)

#### Contexto

El usuario (o TESORERA en nombre de otro) puede pagar por Wompi. El flujo: intención → redirect → pago en Wompi → webhook o retorno → registro en backend. Idempotente por transactionId.

#### Qué está implementado

- [x] Crear intención de pago JUNTA: backend calcula deuda, crea link Wompi.
- [x] Crear intención de pago CARTA: monto según montoCarta.
- [x] Webhook Wompi: verificación HMAC, estado APPROVED, registro idempotente.
- [x] Retorno desde Wompi: verificación y registro si webhook no llegó antes.
- [x] Reconciliación diaria: comparar APPROVED en Wompi vs pagos en BD.
- [x] Wompi por junta (credenciales en Junta).
- [x] Rate limiting en endpoints de pago.

#### Qué validar

- [x] **Usuario paga su propia deuda (AFILIADO, SECRETARIA)**
  - Solo pueden crear intención para su propio usuarioId. Verificar en backend.
  - TESORERA puede crear intención para cualquier usuario de la junta.

- [x] **Monto en centavos**
  - Wompi usa centavos. Verificar que montoCents = deuda * 100 (o montoCarta * 100) correctamente.

- [x] **Webhook y retorno**
  - Si el webhook llega antes que el retorno, el retorno debe indicar "ya registrado" sin error.
  - No duplicar pagos. referenciaExterna = transactionId.

- [x] **Junta sin Wompi configurado**
  - Debe fallar con mensaje claro (WompiNoConfiguradoError).
  - El frontend no debe mostrar "Pagar online" si no hay credenciales.

#### Criterios de validación

- [x] El flujo completo (intención → pago → registro) funciona end-to-end.
- [x] No hay pagos duplicados ante webhook y retorno simultáneos.
- [x] La reconciliación detecta y registra pagos faltantes.
- [x] Las credenciales Wompi son por junta y no se exponen al frontend.
- [x] Toda operación filtra por juntaId.

#### Referencias

- `flujoDePagos.md`, `flujoDePagosCasoFallaWebhook.md`, `flujoDePagosCondicionDeCarrera.md`
- `WOMPI_POR_JUNTA_DOC.md`
- `apps/backend/src/application/pagos/`, `webhooks/`, `wompi-reconciliation/`

---

### 4.3 Listado y filtros de pagos

#### Contexto

La TESORERA necesita ver los pagos registrados, filtrar por usuario, tipo, fechas, y hacer seguimiento.

#### Qué está implementado

- [x] Módulo de pagos en frontend.
- [x] Listado de pagos (verificar si tiene filtros y paginación).

#### Qué implementar o validar

- [x] **Filtros en listado**
  - Por tipo (JUNTA, CARTA), rango de fechas, búsqueda (usuario, consecutivo, referencia).
  - Paginación implementada.

- [x] **Columnas útiles**
  - Fecha, usuario, tipo, método, monto, consecutivo, registrado por.

- [ ] **Exportar pagos (opcional)**
  - CSV o Excel de pagos para contabilidad externa.
  - Filtros aplicados al exportar.

#### Criterios de validación

- [x] La tesorera puede encontrar pagos por usuario y fecha fácilmente.
- [x] Los filtros funcionan correctamente.
- [x] La paginación evita cargar miles de registros a la vez.
- [x] Toda consulta filtra por juntaId.

#### Referencias

- `ROL_TESORERA_FRONTEND.md` §3.2
- `apps/frontend/src/app/features/pagos/`

---

## 5. Cartas laborales

### 5.1 Solicitud y validación de cartas

#### Contexto

Un afiliado solicita carta laboral. Debe cumplir: deuda junta = 0, requisitos adicionales AL_DIA (o exento), pago tipo CARTA. La SECRETARIA valida y aprueba (o rechaza).

#### Qué está implementado

- [x] Solicitar carta: POST /cartas/solicitar (AFILIADO propio, SECRETARIA para otros).
- [x] Validar/aprobar carta: POST /cartas/:id/validar (solo SECRETARIA).
- [x] LetterService: validaciones (deuda, pago carta, requisitos), consecutivo, PDF, QR, S3.
- [x] Descargar PDF: GET /cartas/:id/descargar.
- [x] Listar cartas por usuario o pendientes (SECRETARIA).
- [x] Validación de límite de cartas por plan (LimitesService.validarEmitirCarta).
- [x] vigenciaHasta calculada según vigenciaCartaMeses de la junta.
- [x] Rechazar carta con motivo: POST /cartas/:id/rechazar, frontend con diálogo.
- [x] Consumo de pago CARTA al aprobar: vigencia → false (prisma-letter-emission-context.service.ts).

#### AUTOVALIDACIÓN — **IMPLEMENTADO**

- **Implementado:** Si el usuario cumple requisitos (deuda=0, requisitos AL_DIA, pago CARTA), la solicitud emite la carta automáticamente (sin pasar por PENDIENTE).
- Si no cumple → RequisitosCartaNoCumplidosError.
- emitidaPorId: AFILIADO propio → ADMIN junta; SECRETARIA → id SECRETARIA.
- Ver `DISENO_AUTOVALIDACION_CARTAS.md`.

#### Qué implementar (corto plazo)

- [x] **Rechazar carta** — **IMPLEMENTADO**
  - POST /cartas/:id/rechazar con body `{ motivoRechazo?: string }`. Solo SECRETARIA.
  - Frontend: botón Rechazar, diálogo con motivo opcional.

#### Criterios de validación

- [x] No se puede validar si deuda > 0, requisitos no AL_DIA, o no hay pago CARTA.
- [x] No se puede validar si el usuario no tiene pago CARTA vigente (vigencia=true para carta).
- [x] El consecutivo se asigna correctamente y es único por junta/año.
- [x] El PDF se genera con QR y se sube a S3.
- [x] vigenciaHasta se calcula según vigenciaCartaMeses.
- [x] Existe flujo de rechazo con motivo.
- [x] Solo SECRETARIA ve y gestiona cartas de otros.
- [x] TESORERA no ve tab Cartas de otros (según MATRIZ_PERMISOS_ROLES).
- [x] Toda operación filtra por juntaId.

#### Referencias

- `flujoSolicitudCarta.md`
- `apps/backend/src/application/cartas/`
- `apps/backend/src/domain/services/letter.service.ts`
- `MATRIZ_PERMISOS_ROLES.md` §3.5

---

### 5.2 Validación pública por QR

#### Contexto

Un tercero (empresa, contratista) escanea el QR de la carta para verificar su autenticidad. Endpoint público sin autenticación.

#### Qué está implementado

- [x] GET /public/validar-carta/:qrToken.
- [x] Respuesta: valida, nombre, documento parcial (****1234), fecha emisión, vigenciaHasta, junta, consecutivo.
- [x] Si carta vencida (vigenciaHasta < hoy): mensaje "Carta vencida".
- [x] Si no existe o no aprobada: "Carta no encontrada o no válida".
- [x] Rate limiting (30/min por IP).
- [x] Auditoría de consulta (CONSULTA_VALIDACION_PUBLICA).

#### Qué validar

- [x] **URL del QR**
  - El QR debe apuntar a la URL correcta del frontend o backend (según dónde esté el endpoint público).
  - Ejemplo: `https://app.junta.org/public/validar-carta/{qrToken}` o similar.
  - Verificar que la URL base sea configurable (entorno).

- [x] **Documento parcial**
  - Solo mostrar últimos 4 dígitos. No exponer documento completo.

- [x] **Carta vencida**
  - Si vigenciaHasta < hoy, la carta ya no es válida. El endpoint debe devolver valida: false, mensaje: "Carta vencida".
  - Verificar que la lógica esté correcta (incluye OR vigenciaHasta null para cartas sin vigencia explícita).

#### Criterios de validación

- [x] Cualquiera puede validar una carta con el token sin login.
- [x] La respuesta no incluye datos sensibles (deuda, pagos, etc.).
- [x] Las cartas vencidas se identifican correctamente.
- [x] El rate limiting evita abuso.
- [x] La auditoría registra cada consulta.

#### Referencias

- `validacionesDeCartaQR.md`
- `apps/backend/src/application/public/public.controller.ts`

---

### 5.3 Consumo de pago CARTA al emitir

#### Contexto

El pago tipo CARTA tiene campo `vigencia` (Boolean?): true = vigente (puede usarse para carta), false = consumido (ya se usó). Al aprobar una carta, el pago debe marcarse como consumido.

#### Qué está implementado

- [x] Al aprobar carta: PrismaLetterEmissionContext actualiza el pago CARTA con vigencia = false (consumido).
- [x] La validación de "tiene pago carta" usa solo pagos con vigencia = true y vigenciaHasta >= hoy (si aplica).

#### Qué validar

- [x] **Pago vigente**
  - Si hay varios pagos CARTA vigentes, ¿cuál se usa? El código busca el primero con vigencia=true. Documentar si debe ser el más reciente por fecha.
  - Verificar que vigenciaHasta del pago se use correctamente (algunos pagos pueden tener vigencia limitada).

- [x] **Flujo completo**
  - Confirmar que al aprobar una carta, exactamente un pago se marca consumido y no hay condiciones de carrera si hay múltiples solicitudes.

#### Criterios de validación

- [x] Al aprobar una carta, el pago CARTA correspondiente se marca como consumido.
- [x] No se puede aprobar una segunda carta con el mismo pago (ya consumido).
- [x] La validación de "tiene pago carta" usa solo pagos vigentes.
- [x] La regla de "varios pagos vigentes" está documentada si aplica.

#### Referencias

- `flujoSolicitudCarta.md`
- Schema: `Pago.vigencia Boolean?` – "Solo para tipo CARTA: true = vigente, false = consumido"
- `apps/backend/src/infrastructure/letter/prisma-letter-emission-context.service.ts` (líneas 157-164)

---

## 6. Requisitos adicionales

### 6.1 CRUD de RequisitoTipo

#### Contexto

Cada junta define sus requisitos (agua, basura, etc.). El ADMIN crea y edita RequisitoTipo. Cada requisito puede tener un modificador asignado (usuario que puede cambiar estado AL_DIA/MORA).

#### Qué está implementado

- [x] Crear RequisitoTipo (ADMIN): nombre, modificadorId?, tieneCorteAutomatico.
- [x] Editar RequisitoTipo (ADMIN): PATCH con nombre, modificadorId, tieneCorteAutomatico, activo.
- [x] Listar requisitos por junta.
- [x] EstadoRequisito por (usuarioId, requisitoTipoId).
- [x] HistorialRequisito inmutable por cada cambio.
- [x] Permiso por modificadorId: solo el usuario asignado (o ADMIN) puede cambiar estado.

#### Qué validar

- [x] **Estado inicial de nuevos usuarios**
  - Cuando se crea un usuario, ¿se crean EstadoRequisito para cada RequisitoTipo activo?
  - Si no, el usuario no tendría estado hasta que alguien lo asigne. La validación de carta requiere estado AL_DIA para requisitos con obligacionActiva.
  - Regla: al crear usuario, crear EstadoRequisito con estado = MORA (o AL_DIA según política) y obligacionActiva = true para cada RequisitoTipo activo. O documentar que el modificador debe asignar estado manualmente.
  - Verificar en UsersService.create si se crean EstadosRequisito.

- [x] **Modificador vs RECEPTOR_AGUA**
  - El permiso viene de modificadorId, no del rol RECEPTOR_AGUA. RECEPTOR_AGUA se mantiene por compatibilidad.
  - Cualquier usuario puede ser modificador si se asigna. Verificar que el frontend muestre correctamente los requisitos que el usuario puede modificar.

- [x] **Desactivar RequisitoTipo**
  - activo = false: el requisito ya no se considera para nuevas validaciones.
  - Los EstadoRequisito existentes se mantienen. La validación de carta debe ignorar requisitos inactivos.
  - Verificar en getRequisitosParaCarta que solo incluya requisitos activos.

#### Criterios de validación

- [x] Solo ADMIN puede crear/editar RequisitoTipo.
- [x] Solo el modificador asignado (o ADMIN) puede cambiar estado AL_DIA/MORA.
- [x] Solo ADMIN puede cambiar obligacionActiva (exención).
- [x] El historial registra cada cambio con cambioAutomatico = true/false.
- [x] Los requisitos inactivos no bloquean la emisión de carta.
- [x] Toda operación filtra por juntaId.

#### Referencias

- `flujoRequisitosAdicionales.md`
- `apps/backend/src/application/requisitos/`
- `MATRIZ_PERMISOS_ROLES.md` §3.1, §3.2

---

### 6.2 Corte automático mensual (día 1)

#### Contexto

El día 1 de cada mes, los usuarios con obligacionActiva=true y estado=AL_DIA en requisitos con tieneCorteAutomatico=true pasan a MORA. Simula que "no pagaron a tiempo".

#### Qué está implementado

- [x] RequisitosCronService: @Cron día 1.
- [x] RequisitoService.applyMonthlyCutoff.
- [x] HistorialRequisito con cambioAutomatico = true.
- [x] Auditoría (CORTE_MENSUAL_REQUISITO).

#### Qué validar

- [x] **Horario del cron**
  - Verificar expresión: `0 0 1 * *` (día 1 a las 00:00) o similar.
  - Debe ejecutarse una sola vez. En múltiples instancias, considerar lock.

- [x] **Usuarios exentos**
  - obligacionActiva = false no se tocan. Verificar en applyMonthlyCutoff.

- [x] **Requisitos inactivos**
  - Solo procesar RequisitoTipo con activo = true. Verificar.

#### Criterios de validación

- [x] El cron se ejecuta el día 1.
- [x] Solo usuarios con obligacionActiva y estado AL_DIA pasan a MORA.
- [x] Solo en requisitos con tieneCorteAutomatico y activo.
- [x] El historial y la auditoría registran el cambio.
- [x] No hay errores en ejecución (manejo de junta sin requisitos, etc.).

#### Referencias

- `flujoRequisitosAdicionales.md` §7
- `consecutivosYCronJobs.md`
- `apps/backend/src/application/requisitos/requisitos-cron.service.ts`

---

## 7. Documentos

### 7.1 Subida de documentos

#### Contexto

Documentos de soporte: RECIBO_AGUA, SOPORTE_CARTA. Se suben a S3 y se registran en Documento. El estado de requisitos (AL_DIA/MORA) no depende del documento; lo determina el modificador.

#### Qué está implementado

- [x] POST /documentos (multipart): usuarioId, tipo, file.
- [x] Validación: tipo permitido, tamaño (5 MB), formato (PDF, JPG, PNG).
- [x] Estructura S3: documentos/{juntaId}/{usuarioId}/{tipo}/{uuid}.ext
- [x] Validación de límite de storage (LimitesService.validarStorage).
- [x] sizeBytes en Documento para cálculo de storage.
- [x] Permisos: AFILIADO propio; ADMIN, TESORERA para otros.
- [x] Auditoría en subida.

#### Qué validar

- [x] **SECRETARIA y documentos**
  - MATRIZ_PERMISOS_ROLES: "Subir para otros: ADMIN, TESORERA". SECRETARIA no sube documentos.
  - Documentar: la secretaria pide al usuario que suba o que la tesorera suba.

- [x] **Descarga de documentos** — **IMPLEMENTADO**
  - GET /documentos/:id/descargar (URL firmada S3). usuario-documentos: botón Descargar.
  - ADMIN, SECRETARIA, TESORERA, FISCAL pueden ver/descargar documentos de otros.

- [ ] **Eliminar documento**
  - ¿Se puede eliminar? Si un documento se subió por error, ¿hay forma de borrarlo?
  - Considerar: solo ADMIN o TESORERA, con auditoría. O documentar que no se eliminan (inmutabilidad).

#### Criterios de validación

- [x] Solo tipos RECIBO_AGUA y SOPORTE_CARTA están permitidos.
- [x] El tamaño y formato se validan en backend.
- [x] El storage se valida contra límites del plan.
- [x] La ruta S3 incluye juntaId y usuarioId.
- [x] Toda operación filtra por juntaId (vía usuario).
- [x] Los documentos son accesibles para quienes deben validar cartas.

#### Referencias

- `flujoDocumentos.md`
- `apps/backend/src/application/documentos/`
- `MATRIZ_PERMISOS_ROLES.md` §3.6

---

## 8. Historial laboral

### 8.1 Crear y gestionar historial

#### Contexto

El historial laboral define el estado (TRABAJANDO, NO_TRABAJANDO) por intervalos de tiempo. La deuda se calcula usando el estado vigente en cada mes. No puede haber superposición de intervalos.

#### Qué está implementado

- [x] Crear historial (ADMIN, TESORERA): POST /usuarios/:id/historial-laboral con estado, fechaInicio, fechaFin (opcional).
- [x] Listar historial por usuario.
- [x] Al crear: si hay vigente (fechaFin null), se cierra con fechaFin = fechaInicio del nuevo - 1 día.
- [x] Validación de superposición: HistorialLaboralSuperpuestoError.
- [x] Historial inicial al crear usuario (desde fechaCreacion, vigente).
- [x] Auditoría (ALTA_HISTORIAL_LABORAL).

#### Qué validar o implementar

- [x] **Editar historial**
  - ¿Se puede editar un registro de historial? Por inmutabilidad, generalmente no. Los cambios se hacen cerrando el vigente y creando uno nuevo.
  - Documentar: no editar historial; solo crear nuevos registros para cambios.

- [x] **Eliminar historial**
  - No se debe eliminar: el cálculo de deuda lo necesita.
  - Documentar en políticas de inmutabilidad.

- [x] **Fecha de inicio del nuevo historial**
  - Si se crea con fechaInicio en el pasado, ¿se valida que no solape? La validación de superposición debe cubrir esto.
  - Si fechaInicio es futura, ¿está permitido? Podría ser para programar un cambio. Documentar.

- [x] **UI con Datepicker**
  - ROL_TESORERA_FRONTEND: "Usar Material Datepicker en lugar de input type=date". Verificar si está implementado.

#### Criterios de validación

- [x] No hay superposición de intervalos para el mismo usuario.
- [x] Siempre hay al menos un registro vigente (fechaFin null) para usuarios activos con deuda.
- [x] El cálculo de deuda usa correctamente el historial por mes.
- [x] Solo ADMIN y TESORERA pueden crear historial.
- [x] Toda operación filtra por juntaId (vía usuario).
- [x] La política de no editar/eliminar está documentada.

#### Referencias

- `calculadoraDeDeuda.md` §7
- `apps/backend/src/application/historial-laboral/`
- `definicionDomainServices.md`
- `ROL_TESORERA_FRONTEND.md` §5

---

## 9. Reportes y contabilidad por junta

### 9.1 Dashboard contable (TESORERA)

#### Contexto

La TESORERA necesita una vista de ingresos: total por mes, por año, desglose por tipo (JUNTA, CARTA). Referencia: ROL_TESORERA_FRONTEND §3.3.

#### Qué está implementado

- [x] Dashboard general con accesos rápidos.
- [x] Dashboard contable: tab en módulo pagos con GET /pagos/estadisticas.
- [x] Total ingresos, por método (efectivo, transferencia, online), por tipo (tarifa, carta), por año, por mes (últimos 24).
- [ ] Gráficos (futuro según ROL_TESORERA).

#### Qué implementar

- [x] **Vista de ingresos** — **IMPLEMENTADO**
  - GET /pagos/estadisticas. Total, por método, por tipo, por año, por mes.

- [x] **UI en dashboard o módulo pagos** — **IMPLEMENTADO**
  - Tab "Dashboard contable" con estadísticas. Tab "Listado" con pagos y filtros.

- [x] **Exportar pagos** — **IMPLEMENTADO**
  - GET /pagos/exportar (CSV). Botón "Exportar CSV" en listado. Filtros aplicados.

#### Criterios de validación

- [x] La tesorera ve ingresos por mes y total.
- [x] Los montos son correctos (suma de pagos reales).
- [x] Los filtros funcionan.
- [x] Toda consulta filtra por juntaId.
- [x] La exportación (si existe) incluye los datos correctos.

#### Referencias

- `ROL_TESORERA_FRONTEND.md` §3.3
- `apps/frontend/src/app/features/dashboard/`
- `apps/frontend/src/app/features/pagos/`

---

### 9.2 Reportes por junta (desde Platform Admin)

#### Contexto

El Platform Admin puede exportar datos de una junta (JSON, CSV) para soporte, migración o cumplimiento. Ya existe en operaciones.

#### Qué está implementado

- [x] GET /platform/juntas/:id/exportar?format=json|csv
- [x] UI en junta-detail: botones Exportar JSON, Exportar CSV.
- [x] Reportes globales: juntas, facturación, uso (CSV desde platform dashboard).

#### Qué validar

- [x] **Contenido del export**
  - ¿Qué incluye? Usuarios, pagos, cartas, requisitos, documentos (metadatos, no archivos), tarifas, historial laboral.
  - No debe incluir datos sensibles de otras juntas.
  - Los archivos (S3) no se exportan en el JSON/CSV; solo rutas o referencias. Documentar.

- [x] **Uso de export**
  - Para cumplimiento, migración, backup. Documentar en política de retención.
  - El export es por junta; el Platform Admin solo exporta juntas que administra.

#### Criterios de validación

- [x] El export contiene los datos esperados.
- [x] No hay datos de otras juntas.
- [x] El formato CSV es legible y útil.
- [x] El formato JSON es estructurado y parseable.
- [x] Solo Platform Admin puede exportar.

#### Referencias

- `apps/backend/src/platform/operaciones/`
- `PLAN_ADMINISTRADOR_PLATAFORMA.md` – Exportar datos junta

---

## 10. Cron jobs operativos

### 10.1 Resumen de crons

#### Contexto

Los cron jobs operativos son los que afectan la operación de las juntas (no la facturación de plataforma).

| Cron | Horario | Función | Estado |
|------|---------|---------|--------|
| Corte requisitos (MORA) | Día 1, 00:00 | applyMonthlyCutoff | ✅ |
| Reconciliación Wompi | Diario | Comparar Wompi vs BD | ✅ |

#### Qué validar

- [x] **Ejecución en producción**
  - Los crons deben estar habilitados en el entorno de producción.
  - Verificar que @nestjs/schedule esté configurado y que no haya errores en los logs.

- [ ] **Múltiples instancias**
  - Si hay más de una instancia del backend, los crons podrían ejecutarse dos veces.
  - Para MVP con una instancia: no hay problema.
  - Para escalar: considerar lock distribuido (Redis) o ejecutar crons solo en una instancia designada.
  - Documentar la estrategia.

- [x] **Usuario de auditoría**
  - RequisitosCron y otros usan un usuario para auditoría (ej. platform admin). Verificar que exista y que los eventos de auditoría tengan ejecutadoPorId válido.

#### Criterios de validación

- [x] El corte de requisitos se ejecuta el día 1.
- [x] La reconciliación Wompi se ejecuta diariamente.
- [x] No hay duplicación de ejecuciones (en entorno de una instancia).
- [x] Los errores se registran y no crashean el proceso.
- [x] La auditoría de cron tiene ejecutadoPorId.

#### Referencias

- `consecutivosYCronJobs.md`
- `apps/backend/src/application/requisitos/requisitos-cron.service.ts`
- `apps/backend/src/application/wompi-reconciliation/`

---

## 11. Orden de implementación recomendado

### Fase A – Crítico ✅ Completada

| Orden | Ítem | Estado |
|-------|-----|--------|
| 1 | 5.1 Rechazar carta | ✅ Implementado |
| 2 | 2.1 Búsqueda usuarios en pagos | ✅ Implementado |
| 3 | 2.2 Tarifas/requisitos al crear junta | ✅ Mensaje "Configure tarifas" implementado |

### Fase B – Alto impacto ✅ Completada

| Orden | Ítem | Estado |
|-------|-----|--------|
| 4 | 9.1 Dashboard contable | ✅ Implementado |
| 5 | 4.3 Filtros en listado pagos | ✅ Implementado |
| 6 | 5.3 Consumo pago CARTA | ✅ Verificado |
| 7 | 6.1 Estado inicial requisitos | ⚠️ Por diseño (MORA por defecto) |

### Fase C – Mejora continua

| Orden | Ítem | Estado |
|-------|-----|--------|
| 8 | 3.2 Política tarifas (editar/eliminar) | ⚠️ Documentar inmutabilidad |
| 9 | 7.1 Descarga documentos | ✅ Implementado |
| 10 | 8.1 UI Datepicker historial | Pendiente verificar |
| 11 | 2.1 Usuario inactivo | ✅ Implementado |
| 12 | 9.2 Contenido export | ⚠️ Documentar |
| — | 12. Rol FISCAL | ✅ Implementado |

### Fase D – Refinamiento (pendiente)

| Orden | Ítem | Estado |
|-------|-----|--------|
| 13 | 4.3 Exportar pagos | Opcional |
| 14 | 7.1 Eliminar documento | Si se decide permitirlo |
| 15 | 9.1 Gráficos dashboard | Futuro |

---

## Anexo: Checklist rápido por área

### Usuarios
- [x] Búsqueda/autocomplete en pagos
- [x] Usuario inactivo bloqueado (cartas, pagos)
- [x] Mensaje "Configure tarifas" cuando no hay tarifas

### Deuda y tarifas
- [x] Cálculo validado (mes en curso, tarifa por mes) — verificar
- [x] Política tarifas (no eliminar) documentada

### Pagos
- [x] Filtros en listado (tipo, fechas, búsqueda)
- [x] Dashboard contable (ingresos por mes)
- [x] Exportar pagos (CSV)

### Cartas
- [x] Rechazar con motivo
- [x] Autovalidación (emisión automática si cumple)
- [x] Consumo pago CARTA al emitir verificado
- [x] QR y validación pública OK

### Requisitos
- [x] Estado inicial para nuevos usuarios (por diseño: MORA por defecto)
- [x] Corte día 1 verificado
- [x] Permisos modificador correctos

### Documentos
- [x] Descarga/visualización para validación
- [x] Permisos SECRETARIA documentados (no sube; pide a tesorera/usuario)

### Historial laboral
- [x] Política no editar/eliminar documentada
- [x] Datepicker en UI (TESORERA) — verificar

### Cron
- [x] Requisitos y Wompi ejecutándose
- [x] Sin duplicación en múltiples instancias — documentar (ver `CRON_MULTI_INSTANCIA_ANALISIS.md`)

### Rol FISCAL
- [x] Implementado (solo lectura)

---

## 12. Nuevos roles

### 12.1 Rol FISCAL — **IMPLEMENTADO**

- [x] **FISCAL** implementado. Ver `DISENO_ROL_FISCAL.md`.
  - Permisos: PAGOS_VER, AUDITORIAS_VER, USUARIOS_VER, CARTAS_VER, REQUISITOS_VER, TARIFAS_VER (solo lectura).
  - Backend: RolNombre.FISCAL, permissions-from-roles, PermissionService.
  - Frontend: guards, menú, tabs usuario-detail, ocultar Registrar/Validar según permiso.
  - ADMIN puede asignar rol FISCAL desde detalle de usuario.

### 12.2 Roles candidatos (futuros)

| Rol | Función típica | Estado |
|-----|----------------|--------|
| CONSILIADOR | Resolución de conflictos | Pendiente de planificar |

---

---

## 13. Lista de ítems pendientes de implementar

_Tras verificación en código (2026-02-25), los siguientes ítems requieren implementación o documentación:_

| # | Ítem | Tipo | Acción |
|---|------|------|--------|
| 1 | Documentación de onboarding (pasos configuración inicial) | Documentación | ✅ Añadido en `flujoBootstrapYOnboarding.md` §7.1 |
| 2 | Permisos SECRETARIA en documentos (no sube; pide a tesorera/usuario) | Documentación | ✅ Añadido en `flujoDocumentos.md` §7 |
| 3 | Crons multi-instancia (evitar duplicación al escalar) | Documentación | ✅ Referenciado en `consecutivosYCronJobs.md` §2.4 |
| 4 | Fecha de inicio historial (pasado/futuro, validación solapamiento) | Documentación | ✅ Añadido en `politicasInmutabilidad.md` §3 |
| 5 | Contenido y uso del export Platform Admin | Documentación | ✅ Añadido en `PLAN_ADMINISTRADOR_PLATAFORMA.md` §2.8 |

_Nota: Exportar pagos, descarga documentos, Datepicker, estado inicial requisitos y la mayoría de criterios ya están implementados y verificados._

---

**Documento vivo:** Actualizar este checklist a medida que se implementen los ítems. La versión y fecha deben reflejar los cambios.

**Versión:** 1.1 · **Fecha verificación:** 2026-02-25
