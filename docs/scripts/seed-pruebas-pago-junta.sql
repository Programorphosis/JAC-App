-- =============================================================================
-- Script para configurar datos de prueba del flujo de pago de tarifa junta
-- Ejecutar en pgAdmin (Query Tool)
-- =============================================================================
-- ATENCIÓN: Este script BORRA los pagos tipo JUNTA del usuario para poder
-- repetir la prueba. Usar SOLO en entorno de desarrollo/pruebas.
-- =============================================================================
-- INSTRUCCIONES:
-- 1. Reemplaza 'TU_JUNTA_ID' y 'TU_USUARIO_ID' con los IDs reales (líneas 15-16).
-- 2. Para obtener los IDs: SELECT id, nombre FROM "Junta"; SELECT id, nombres, apellidos FROM "Usuario" WHERE "juntaId" = '...';
-- 3. Ejecuta todo el script (F5 o botón Execute).
-- =============================================================================

-- >>> REEMPLAZA ESTOS VALORES CON LOS DE TU BASE DE DATOS <<<
-- Puedes obtenerlos con: SELECT id FROM "Junta" LIMIT 1;  y  SELECT id FROM "Usuario" WHERE "juntaId" = '...' LIMIT 1;
DO $$
DECLARE
  v_junta_id   TEXT := 'TU_JUNTA_ID';   -- Reemplaza con UUID de tu junta
  v_usuario_id TEXT := 'TU_USUARIO_ID'; -- Reemplaza con UUID del usuario afiliado a probar
  v_deleted    INT;
BEGIN
  -- Si dejaste los placeholders, intentar auto-detectar (primera junta, primer usuario)
  IF v_junta_id = 'TU_JUNTA_ID' THEN
    SELECT id INTO v_junta_id FROM "Junta" LIMIT 1;
  END IF;
  IF v_usuario_id = 'TU_USUARIO_ID' AND v_junta_id IS NOT NULL AND v_junta_id != 'TU_JUNTA_ID' THEN
    SELECT id INTO v_usuario_id FROM "Usuario" WHERE "juntaId" = v_junta_id AND "activo" = true LIMIT 1;
  END IF;

  IF v_junta_id IS NULL OR v_junta_id = 'TU_JUNTA_ID' OR v_usuario_id IS NULL OR v_usuario_id = 'TU_USUARIO_ID' THEN
    RAISE EXCEPTION 'No se encontraron Junta o Usuario. Reemplaza TU_JUNTA_ID y TU_USUARIO_ID manualmente.';
  END IF;

  RAISE NOTICE 'Usando Junta: %, Usuario: %', v_junta_id, v_usuario_id;

  -- 0. BORRAR PAGOS JUNTA del usuario (SOLO PRUEBAS: permite repetir el mismo pago)
  DELETE FROM "Pago"
  WHERE "usuarioId" = v_usuario_id AND "juntaId" = v_junta_id AND tipo = 'JUNTA';
  GET DIAGNOSTICS v_deleted = ROW_COUNT;
  RAISE NOTICE 'Pagos JUNTA eliminados: % (puedes repetir la prueba)', v_deleted;

  -- 1. ACTUALIZAR TARIFAS: fechaVigencia para enero 2026
  UPDATE "Tarifa"
  SET "fechaVigencia" = '2026-01-01'
  WHERE "juntaId" = v_junta_id
    AND "estadoLaboral" IN ('TRABAJANDO', 'NO_TRABAJANDO');

  -- Si no hay tarifas, crearlas
  INSERT INTO "Tarifa" (id, "juntaId", "estadoLaboral", "valorMensual", "fechaVigencia", "fechaCreacion")
  SELECT gen_random_uuid(), v_junta_id, 'TRABAJANDO', 20000, '2026-01-01', now()
  WHERE NOT EXISTS (SELECT 1 FROM "Tarifa" WHERE "juntaId" = v_junta_id AND "estadoLaboral" = 'TRABAJANDO');

  INSERT INTO "Tarifa" (id, "juntaId", "estadoLaboral", "valorMensual", "fechaVigencia", "fechaCreacion")
  SELECT gen_random_uuid(), v_junta_id, 'NO_TRABAJANDO', 3000, '2026-01-01', now()
  WHERE NOT EXISTS (SELECT 1 FROM "Tarifa" WHERE "juntaId" = v_junta_id AND "estadoLaboral" = 'NO_TRABAJANDO');

  -- 2. HISTORIAL LABORAL: actualizar vigente o crear
  UPDATE "HistorialLaboral"
  SET "fechaInicio" = '2026-01-01', "fechaFin" = NULL
  WHERE "usuarioId" = v_usuario_id AND "fechaFin" IS NULL;

  INSERT INTO "HistorialLaboral" (id, "usuarioId", estado, "fechaInicio", "fechaFin", "creadoPorId", "fechaCreacion")
  SELECT gen_random_uuid(), v_usuario_id, 'TRABAJANDO', '2026-01-01', NULL, v_usuario_id, now()
  WHERE NOT EXISTS (SELECT 1 FROM "HistorialLaboral" WHERE "usuarioId" = v_usuario_id);

  -- 3. Usuario: ajustar fechaCreacion si es posterior a enero 2026
  UPDATE "Usuario"
  SET "fechaCreacion" = '2026-01-01'
  WHERE id = v_usuario_id AND "fechaCreacion" > '2026-01-31';

  RAISE NOTICE 'Script completado.';
END $$;

-- =============================================================================
-- VERIFICACIÓN (ejecuta estas consultas después para comprobar)
-- =============================================================================

-- Tarifas vigentes para enero 2026 (usa la primera junta si no reemplazaste)
SELECT t.id, t."estadoLaboral", t."valorMensual", t."fechaVigencia"
FROM "Tarifa" t
WHERE t."juntaId" = (SELECT id FROM "Junta" LIMIT 1)
  AND t."fechaVigencia" <= '2026-01-31'
ORDER BY t."estadoLaboral";

-- Historial laboral (usa el primer usuario de la junta si no reemplazaste)
SELECT h.id, h.estado, h."fechaInicio", h."fechaFin", u.nombres, u.apellidos
FROM "HistorialLaboral" h
JOIN "Usuario" u ON u.id = h."usuarioId"
WHERE h."usuarioId" = (SELECT id FROM "Usuario" WHERE "juntaId" = (SELECT id FROM "Junta" LIMIT 1) AND "activo" = true LIMIT 1)
ORDER BY h."fechaInicio" DESC;
