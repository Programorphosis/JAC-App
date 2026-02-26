-- Índices compuestos para consultas multi-tenant frecuentes.
-- Según análisis de cuellos de botella: con 50k+ registros, queries sin índice compuesto
-- hacen full scans lentos. Estos índices hacen que el crecimiento sea casi lineal.
-- Nota: sin CONCURRENTLY para compatibilidad con el bloque de transacción de Prisma Migrate.
-- En producción con tablas grandes, aplicar manualmente con CONCURRENTLY fuera de una tx.

-- Pago: listados filtrados por junta + rango de fechas (ej. pagos del mes)
CREATE INDEX IF NOT EXISTS "Pago_juntaId_fechaPago_idx"
  ON "Pago" ("juntaId", "fechaPago");

-- Carta: filtros por estado dentro de una junta (PENDIENTE, APROBADA, etc.)
CREATE INDEX IF NOT EXISTS "Carta_juntaId_estado_idx"
  ON "Carta" ("juntaId", "estado");

-- Carta: listados paginados por junta ordenados por fecha de solicitud
CREATE INDEX IF NOT EXISTS "Carta_juntaId_fechaSolicitud_idx"
  ON "Carta" ("juntaId", "fechaSolicitud");

-- Auditoria: listados de eventos paginados por junta y fecha
CREATE INDEX IF NOT EXISTS "Auditoria_juntaId_fecha_idx"
  ON "Auditoria" ("juntaId", "fecha");
