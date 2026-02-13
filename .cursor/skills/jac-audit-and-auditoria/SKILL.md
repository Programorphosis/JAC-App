---
name: jac-audit-and-auditoria
description: Implements or reviews audit logging and immutability of critical data. Use when working on the Auditoria table, audit interceptor, logging of payments/letters/water/historial changes, or when ensuring no UPDATE/DELETE on critical tables. References plan.md §10, investigacionImplementacionDeSeguridadDeLaApp.
---

# Auditoría JAC

## Cuándo usar esta skill

- Implementar o modificar el registro en la tabla `Auditoria`.
- Crear interceptor global NestJS que registre acciones críticas.
- Revisar que pagos, cartas, agua e historial laboral generen evento de auditoría.
- Garantizar inmutabilidad de tablas críticas (solo INSERT donde aplique).

## Tabla Auditoria (modelo del proyecto)

Campos: id, juntaId, entidad, entidadId, accion, metadata (JSON), ejecutadoPorId, fecha. Índices por juntaId y entidad. La auditoría es inmutable: no UPDATE ni DELETE.

## Acciones que deben generar auditoría

- Registro de pago (efectivo u online).
- Emisión o validación de carta.
- Cambio de estado de agua o de obligación de agua.
- Cambio de historial laboral.
- (Opcional) Login exitoso/fallido, acceso a datos sensibles.

Cada evento debe incluir juntaId, entidad, entidadId, accion, metadata relevante, ejecutadoPorId (del token), fecha.

## Inmutabilidad de datos críticos

Tablas que no deben actualizarse ni borrarse para corregir: pagos, historial_laboral, historial_agua, auditoría. Si algo se registró mal, se corrige con un nuevo registro (ajuste/corrección documentado), no editando el anterior. En Prisma/PostgreSQL considerar restringir DELETE/UPDATE en roles de aplicación si el proyecto lo define así.

## Interceptor global

Un interceptor en NestJS puede capturar respuestas exitosas de endpoints críticos y llamar a AuditService.registerEvent con entidad, accion y metadata. La lógica de negocio (p. ej. PaymentService, LetterService) también puede llamar a AuditService dentro de la misma transacción para garantizar que el evento se registre solo si la operación commitó.

## Documento de referencia

**plan.md** (§10 Auditoría formal), **investigacionImplementacionDeSeguridadDeLaApp.md** (auditoría obligatoria, hash encadenado opcional).
