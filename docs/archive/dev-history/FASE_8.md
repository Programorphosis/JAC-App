# Fase 8 – Auditoría y seguridad reforzada

**Fecha:** 2025-02-14  
**Objetivo:** Trazabilidad completa y medidas de seguridad explícitas.

---

## Resumen del trabajo

Se consolidó la auditoría en acciones críticas, se configuró rate limiting por endpoint, se validó HMAC en webhooks Wompi y se documentaron las políticas de inmutabilidad. Esta fase se implementó de forma transversal durante las fases 4–7 (pagos, requisitos, cartas).

---

## Cambios realizados

### 1. Auditoría

- **Tabla Auditoria**: juntaId, entidad, entidadId, accion, metadata, ejecutadoPorId, fecha.
- **Acciones registradas:**
  - Pago: REGISTRO_PAGO_JUNTA, REGISTRO_PAGO_CARTA
  - Carta: SOLICITUD_CARTA, EMISION_CARTA, CONSULTA_VALIDACION_PUBLICA
  - Requisito: cambio de estado/obligación vía HistorialRequisito
  - Historial laboral: altas (sin edición)
  - Login: LOGIN_EXITOSO (usuarios con juntaId)
  - Documento: SUBIDA_DOCUMENTO

### 2. Rate limiting (ThrottlerModule)

| Ámbito | Límite | Ubicación |
|--------|--------|-----------|
| Global | 60/min | app.module.ts |
| Login | 5/min | auth.controller.ts |
| Pagos | 20/min | pagos.controller.ts |
| validar-carta | 30/min | public.controller.ts |
| Webhooks | Excluido | webhooks.controller.ts (@SkipThrottle) |

### 3. Validación HMAC webhook Wompi

- Verificación de firma con WOMPI_EVENTS_SECRET.
- Rechazo de webhooks no firmados correctamente.

### 4. Políticas de inmutabilidad

- Documento: `docs/politicasInmutabilidad.md`
- Tablas sin UPDATE/DELETE: Pago, HistorialLaboral, HistorialRequisito, Auditoria, Tarifa (versionado).
- Excepción documentada: Carta PENDIENTE → APROBADA/RECHAZADA.

---

## Pendiente (opcional)

- Hash encadenado en eventos de auditoría para anti-manipulación (plan.md, investigacionImplementacionDeSeguridadDeLaApp.md).

---

## Referencias

- plan.md §10
- investigacionImplementacionDeSeguridadDeLaApp.md
- 00_ARQUITECTURA_RECTOR copy.md
- politicasInmutabilidad.md
