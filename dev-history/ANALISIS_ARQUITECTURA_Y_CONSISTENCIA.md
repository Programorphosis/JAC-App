# Análisis General de Arquitectura y Consistencia – Sistema JAC

**Fecha:** 2025-02-13  
**Objetivo:** Revisión exhaustiva del desarrollo para detectar incongruencias, asegurar alineación con la arquitectura rectora y mantener escalabilidad y mantenibilidad.

---

## 1. Resumen Ejecutivo

| Área | Estado | Observaciones |
|------|--------|---------------|
| Capas (Domain / Application / Infrastructure) | ✅ Correcto | Separación respetada en general |
| Multi-tenant (juntaId) | ⚠️ Revisar | Algunas queries sin juntaId; casos justificados |
| Auditoría | ⚠️ Inconsistencias | Varios servicios sin auditoría; uso mixto AuditService vs prisma directo |
| Pagos (JUNTA vs CARTA) | ⚠️ Asimetría | CARTA fuera de PaymentService; registerCartaPayment sin Serializable |
| Puertos huérfanos | ⚠️ Limpieza | pdf-generator.port.ts no usado |
| Transacciones | ⚠️ Revisar | registerCartaPayment sin isolationLevel Serializable |
| Idempotencia pago CARTA | ⚠️ Revisar | No se verifica referenciaExterna antes de crear |

---

## 2. Estructura de Capas

### 2.1 Domain Layer (`src/domain/`)

**Servicios de dominio (puros, sin framework):**
- `DebtService` – cálculo de deuda
- `PaymentService` – registro pago JUNTA
- `LetterService` – emisión de carta
- `RequisitoService` – cambios de estado/obligación y corte mensual
- `AuditService` – registro de eventos (wrapper sobre IAuditEventStore)

**Puertos:**
- `IDebtDataProvider`, `IPaymentRegistrationContext`, `ILetterEmissionContext`
- `IRequisitoRepository`, `IAuditEventStore`
- `IPdfGenerator` – **huérfano**: no se usa; la generación de PDF está en `CartaPdfService` (infra)

**Conclusión:** La capa de dominio está bien definida. El puerto `IPdfGenerator` quedó obsoleto al implementar `CartaPdfService` directamente en el contexto de emisión.

### 2.2 Application Layer (`src/application/`)

**Módulos y responsabilidades:**
- Controllers: validan DTO, llaman servicios, devuelven respuesta
- Servicios de aplicación: orquestan dominio + infraestructura

**Observaciones:**
- `PagosService` orquesta `PaymentRegistrationRunner` y `WompiService` correctamente.
- `CartasService` usa `LetterEmissionRunner` para validar; `PrismaService` directo para solicitar.
- `RequisitosService` usa `RequisitoOperationRunner` para operaciones transaccionales; Prisma directo para CRUD de RequisitoTipo.
- `EstadoGeneralService` inyecta `DebtService` y `IRequisitoRepository`; mezcla dominio con Prisma para conteo de pagos CARTA.

### 2.3 Infrastructure Layer (`src/infrastructure/`)

**Adaptadores Prisma:**
- `PrismaDebtDataProvider`, `PrismaPaymentRegistrationContext`, `PrismaLetterEmissionContext`
- `PrismaRequisitoRepository`, `PrismaAuditEventStore`

**Runners (orquestan dominio + transacción):**
- `PaymentRegistrationRunner`, `LetterEmissionRunner`, `RequisitoOperationRunner`

**Servicios externos:**
- `WompiService`, `S3StorageService`, `CartaPdfService`

**Conclusión:** La infraestructura está bien organizada. Los runners encapsulan la transacción y el uso de contextos.

---

## 3. Multi-Tenant y juntaId

### 3.1 Regla

> Toda consulta que acceda a datos de una junta DEBE filtrar por juntaId. Nunca confiar en juntaId desde el frontend.

### 3.2 Casos revisados

| Archivo | Query | ¿juntaId? | Comentario |
|---------|-------|-----------|------------|
| `public.controller.ts` | `carta.findUnique({ qrToken, estado })` | No | **Aceptable**: endpoint público, lookup por `qrToken` único. No hay JWT. |
| `prisma-payment-registration-context` | `findPagoByReferenciaExterna(ref)` | No | **Aceptable**: `referenciaExterna` es `@unique` en Pago. |
| `users.service.ts` | `usuario.update({ where: { id } })` | No | **Mejorable**: ya se validó con `obtener(id, juntaId)`. Añadir `juntaId` en el `where` refuerza defensa en profundidad. |
| `requisitos.service.ts` | `requisitoTipo.update({ where: { id } })` | No | **Mejorable**: ya se validó con `findFirst({ id, juntaId })`. Añadir `juntaId` en el `where` refuerza consistencia. |
| `auth.service.ts` | `usuario.findUnique({ id })` | No | **Aceptable**: capa de autenticación; el ID viene del JWT. |
| `historial-laboral.service` | `historialLaboral.findMany({ usuarioId })` | Implícito | **Aceptable**: `usuarioId` se validó antes contra `(id, juntaId)`. |

### 3.3 Recomendaciones

1. En `users.service.update`: usar `where: { id, juntaId }` si el modelo lo permite.
2. En `requisitos.service.actualizarRequisitoTipo`: usar `where: { id, juntaId }` en el `update`.

---

## 4. Auditoría

### 4.1 Patrones actuales

- **Dominio/infra (runners):** usan `ctx.registerAudit` o `auditStore.registerEvent`.
- **Application con AuditService:** `users`, `historial-laboral`, `tarifas`, `junta`, `platform`.
- **Application con Prisma directo:** `cartas.service`, `documentos.service`, `public.controller`.

### 4.2 Gaps de auditoría

| Operación | ¿Auditoría? | Acción sugerida |
|-----------|-------------|-----------------|
| `RequisitosService.crearRequisitoTipo` | No | Añadir `ALTA_REQUISITO_TIPO` |
| `RequisitosService.actualizarRequisitoTipo` | No | Añadir `ACTUALIZACION_REQUISITO_TIPO` |
| `cartas.service.solicitar` | Sí (prisma directo) | Mantener; considerar migrar a AuditService |
| `documentos.service.subir` | Sí (prisma directo) | Mantener; considerar migrar a AuditService |
| `public.controller.validarCarta` | Sí (prisma directo) | Mantener; endpoint público sin AuditService inyectado |

### 4.3 Recomendaciones

1. Añadir auditoría a `crearRequisitoTipo` y `actualizarRequisitoTipo`.
2. Unificar el uso de auditoría: preferir `AuditService` en application para consistencia y futuras extensiones (ej. envío a sistema externo).

---

## 5. Pagos: JUNTA vs CARTA

### 5.1 Asimetría arquitectónica

- **Pago JUNTA:** pasa por `PaymentService.registerJuntaPayment` (dominio) con `IPaymentRegistrationContext`.
- **Pago CARTA:** lógica en `PaymentRegistrationRunner.registerCartaPayment` (infra), sin pasar por `PaymentService`.

**Motivo:** El pago CARTA usa `Junta.montoCarta` fijo, no deuda calculada. La lógica es distinta.

**Evaluación:** La separación es razonable. Unificar en dominio requeriría extender `PaymentService` con `registerCartaPayment` y un contexto ampliado. Para mantener simplicidad, la asimetría es aceptable si se documenta.

### 5.2 Transacción y aislamiento

| Operación | `isolationLevel` | Documento |
|-----------|------------------|-----------|
| `registerJuntaPayment` | `Serializable` | flujoDePagosCondicionDeCarrera.md |
| `registerCartaPayment` | Por defecto (Read Committed) | — |

**Riesgo:** Para CARTA no hay recálculo de deuda, pero sí concurrencia (mismo link Wompi, webhooks duplicados). La idempotencia depende de `referenciaExterna` única.

**Recomendación:** Usar `Serializable` también en `registerCartaPayment` para alineación con la documentación y protección ante condiciones de carrera.

### 5.3 Idempotencia en pago CARTA

- **JUNTA:** `PaymentService` llama a `findPagoByReferenciaExterna` antes de crear; si existe, lanza `PagoDuplicadoError`.
- **CARTA:** no se comprueba `referenciaExterna` antes de crear; se confía en el `@unique` de la BD.

**Riesgo:** Si el webhook se repite, Prisma lanzará un error de constraint en lugar de `PagoDuplicadoError`. El webhook solo captura `PagoDuplicadoError` y devuelve `received: true`; un error de constraint se propagaría.

**Recomendación:** En `registerCartaPayment`, cuando exista `referenciaExterna`, llamar a `findPagoByReferenciaExterna` antes de crear y lanzar `PagoDuplicadoError` si ya existe.

---

## 6. Puertos y Código Huérfano

### 6.1 `pdf-generator.port.ts`

- **Estado:** No referenciado.
- **Motivo:** La generación de PDF se implementó en `CartaPdfService` y se usa vía `PrismaLetterEmissionContext` con opción `pdfService`.
- **Acción:** Eliminar `pdf-generator.port.ts` o documentar que está deprecado en favor de `CartaPdfService`.

---

## 7. Otros Puntos

### 7.1 Estado general y deuda

En `EstadoGeneralService`, si el cálculo de deuda falla por `SinHistorialLaboralError`, `SinTarifaVigenteError` o `HistorialLaboralSuperpuestoError`, se devuelve `deuda_junta = 0`.

**Riesgo:** El usuario puede ver deuda 0 y pensar que puede solicitar/validar carta, cuando la validación real fallará por historial/tarifa.

**Opciones:** Devolver un indicador de error (ej. `deuda_no_calculable: true`) o un mensaje específico para que el frontend lo muestre.

### 7.2 Carta PENDIENTE y qrToken

En `cartas.service.solicitar` se crea la carta con `qrToken: randomUUID()`. En `LetterService.emitLetter` se genera un nuevo `qrToken` al aprobar.

**Conclusión:** Correcto. El token inicial se sobrescribe; el QR público solo es válido para cartas APROBADAS.

### 7.3 Consecutivos

Según `consecutivosYCronJobs.md`:
- PAGO_JUNTA, PAGO_CARTA, CARTA.

Implementación:
- `PrismaPaymentRegistrationContext`: `getNextConsecutivoPagoJunta`, `getNextConsecutivoPagoCarta`.
- `PrismaLetterEmissionContext`: `getNextConsecutivoCarta` con tipo `'CARTA'`.

**Conclusión:** Alineado con la documentación.

### 7.4 Cron de corte mensual

`RequisitosCronService` usa `@Cron` para ejecutar `applyMonthlyCutoff`. Configuración coherente con `consecutivosYCronJobs.md`.

### 7.5 Reconciliación Wompi

Según el roadmap, el job de reconciliación nocturna está pendiente. No se ha implementado.

---

## 8. Checklist de Acciones Sugeridas

| Prioridad | Acción | Estado |
|-----------|--------|--------|
| Alta | Añadir `isolationLevel: 'Serializable'` a `registerCartaPayment` | ✅ Aplicado |
| Alta | Verificar `referenciaExterna` en `registerCartaPayment` antes de crear (idempotencia) | ✅ Aplicado |
| Media | Añadir auditoría a `crearRequisitoTipo` y `actualizarRequisitoTipo` | ✅ Aplicado |
| Media | Usar `where: { id, juntaId }` en updates de `users.service` y `requisitos.service` | ⏭️ Omitido (Prisma requiere PK único; validación previa con findFirst es suficiente) |
| Baja | Eliminar o deprecar `pdf-generator.port.ts` | ✅ Eliminado |
| Baja | Unificar uso de auditoría (AuditService vs prisma directo) | Pendiente |
| Baja | Revisar UX de `EstadoGeneralService` cuando la deuda no es calculable | Pendiente |

---

## 9. Conclusión

La arquitectura general está bien aplicada: dominio puro, aplicación orquestando y adaptadores en infraestructura. Los puntos críticos son:

1. **Pagos CARTA:** idempotencia explícita y nivel de aislamiento Serializable.
2. **Auditoría:** completar en requisitos y unificar el patrón.
3. **Multi-tenant:** reforzar `where` con `juntaId` donde sea posible.
4. **Limpieza:** eliminar o deprecar el puerto de PDF no usado.

Con estos ajustes, el sistema mantiene coherencia con la arquitectura rectora y mejora su mantenibilidad y escalabilidad.
