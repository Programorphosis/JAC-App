---
name: jac-domain-services
description: Implements or refactors domain layer services (Debt, Payment, Letter, Requisito, Audit). Use when creating or modifying services in domain/, or when ensuring business logic stays pure and framework-agnostic. References definicionDomainServices.md.
---

# Servicios de dominio JAC

## Cuándo usar esta skill

- Crear o modificar servicios en `domain/` (DebtService, PaymentService, LetterService, RequisitoService, AuditService).
- Mover lógica de negocio desde controllers o aplicación a la capa de dominio.
- Revisar que la capa de dominio no dependa de HTTP ni del framework.

## Restricciones de la capa de dominio

- No usar decorators de Nest (Get, Post, etc.).
- No lanzar `HttpException` ni devolver tipos `Response`.
- No usar `req`, `res` ni inyección de contexto HTTP.
- No depender directamente de Prisma en la firma pública; recibir `tx` o abstracción de repositorio si hace falta para transacciones.

## Servicios y responsabilidades

| Servicio      | Responsabilidad principal |
|---------------|----------------------------|
| DebtService   | Calcular deuda (solo lectura + cálculo). Nunca escribe. |
| AuditService  | Registrar evento en tabla Auditoria (juntaId, entidad, entidadId, accion, metadata, ejecutadoPorId). |
| PaymentService| Registrar pago JUNTA: calcular deuda dentro de tx, validar monto = total, insertar Pago, auditoría. No recibe "monto" como input; lo deriva de la deuda. |
| RequisitoService | Cambio estado/obligación por RequisitoTipo; insertar HistorialRequisito en cada cambio; job mensual día 1 (pasar AL_DIA → MORA para requisitos con tieneCorteAutomatico). |
| LetterService | Validar requisitos (deuda=0, requisitos adicionales AL_DIA, pago carta); emitir carta en transacción: consecutivo anual, qrToken, PDF, actualizar estado. |

## Invariantes

- Nunca guardar deuda. Nunca aceptar montos manipulables desde fuera.
- Nunca generar carta sin validación completa. Nunca modificar EstadoRequisito/HistorialRequisito fuera de RequisitoService.
- Todo cambio crítico debe generar auditoría. Ninguna operación debe ignorar juntaId.

## Documento de referencia

**definicionDomainServices.md** – Contratos, métodos principales y flujos por servicio.
