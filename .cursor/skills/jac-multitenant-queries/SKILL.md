---
name: jac-multitenant-queries
description: Ensures all database queries and API operations are scoped by juntaId (multi-tenant). Use when writing or reviewing Prisma queries, new endpoints, or any code that reads/writes entities belonging to a junta. References 00_ARQUITECTURA_RECTOR copy.md.
---

# Consultas multi-tenant JAC

## Cuándo usar esta skill

- Escribir o revisar `prisma.*` (findMany, findFirst, create, update, etc.) sobre entidades de junta.
- Crear nuevos endpoints o servicios que tocan Usuario, Pago, Carta, Tarifa, Auditoria, Consecutivo, etc.
- Revisar que ningún flujo confíe en `juntaId` enviado por el frontend.

## Regla absoluta

Ninguna consulta puede ejecutarse sin filtro por `juntaId`. El `juntaId` debe provenir del **token JWT** (usuario autenticado), nunca del body, query o headers enviados por el cliente.

## Patrones correctos

- **Lectura**: `where: { juntaId: authUser.juntaId, id: entityId }` (y variantes con relaciones).
- **Creación**: incluir `juntaId: authUser.juntaId` en `data`.
- **Entidades vía Usuario**: si la entidad no tiene juntaId pero pertenece a un usuario, filtrar por `usuario: { juntaId: authUser.juntaId }` (ej. EstadoRequisito, HistorialRequisito). RequisitoTipo tiene juntaId directo.

## Patrones prohibidos

- `where: { id: pagoId }` sin juntaId.
- `data: { ...body, juntaId: body.juntaId }` (nunca tomar juntaId del request).
- Valores hardcodeados de junta o de usuario para saltarse el filtro.

## JWT

El token debe incluir `userId`, `juntaId`, `roles`. El middleware/guard debe extraer `juntaId` y dejarlo disponible para los servicios.

## Documento de referencia

**00_ARQUITECTURA_RECTOR copy.md** – Aislamiento multi-tenant, seguridad obligatoria, índices.
