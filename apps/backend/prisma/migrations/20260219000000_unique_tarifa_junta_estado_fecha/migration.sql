-- Cambiar índice compuesto en Tarifa por constraint único para evitar
-- ambigüedad en el cálculo de deuda cuando existen dos tarifas con la misma
-- combinación (juntaId, estadoLaboral, fechaVigencia).

-- Eliminar índice anterior
DROP INDEX IF EXISTS "Tarifa_juntaId_estadoLaboral_fechaVigencia_idx";

-- Crear constraint único
CREATE UNIQUE INDEX "Tarifa_juntaId_estadoLaboral_fechaVigencia_key"
  ON "Tarifa"("juntaId", "estadoLaboral", "fechaVigencia");
