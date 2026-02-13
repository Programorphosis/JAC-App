---
name: jac-prisma-and-schema
description: Keeps Prisma schema and migrations aligned with the official data model. Use when adding or changing models, fields, indexes, or when writing migrations. References SCHEMA BASE v1.md, 00_ARQUITECTURA_RECTOR copy.
---

# Prisma y schema base JAC

## Cuándo usar esta skill

- Crear o modificar el archivo `schema.prisma`.
- Escribir o revisar migraciones.
- Añadir índices, unique constraints o relaciones.
- Resolver dudas sobre si una entidad debe llevar juntaId o cómo indexar.

## Modelo oficial

El schema de referencia es **SCHEMA BASE v1.md**. No agregar campos sin justificación formal. No eliminar relaciones ni simplificar por comodidad. Principios: claves foráneas estrictas, índices en campos críticos, transacciones en operaciones de pago, ningún dato calculado persistido (p. ej. no tabla de deudas), consecutivos en entidades auditables (pagos, cartas).

## Reglas por entidad

- **Multi-tenant**: Toda entidad que pertenezca a una junta lleva `juntaId`. Índice por juntaId; compuestos cuando aplique (ej. `@@unique([juntaId, tipo, anio])` en Consecutivo).
- **Pago**: Incluir `consecutivo Int` (obligatorio, obtenido de tabla Consecutivo o lógica por junta/tipo/anio) y `@@unique([juntaId, tipo, consecutivo])`. `referenciaExterna String? @unique` para idempotencia (Wompi o número de transferencia). Método puede ser EFECTIVO, TRANSFERENCIA u ONLINE.
- **Carta**: Campos opcionales `rutaPdf String?` (URL/ruta S3 del PDF generado al aprobar), `hashDocumento String?` (SHA256 del PDF, integridad), `motivoRechazo String?` (para cartas rechazadas). Campos obligatorios al aprobar: qrToken, fechaEmision, emitidaPorId.
- **Deuda**: No existe tabla "deudas"; la deuda se calcula en backend, no se persiste.
- **Historial**: historial_laboral e historial_agua son solo INSERT; no se editan ni borran registros históricos para “corregir”; correcciones vía nuevo registro si el proyecto lo define.

## Consultas

Toda consulta sobre entidades de junta debe incluir filtro por juntaId (del token). Para entidades que no tienen juntaId pero pertenecen a un usuario (ej. EstadoAgua), filtrar vía relación Usuario.juntaId.

## Migraciones

Aplicar migraciones de forma controlada; documentar cambios relevantes. No romper datos existentes; si hay cambio de tipo o constraint, planear migración de datos si hace falta.

## Documento de referencia

**SCHEMA BASE v1.md** – Modelo congelado, enums, relaciones. **00_ARQUITECTURA_RECTOR copy.md** – Aislamiento multi-tenant, índices.
