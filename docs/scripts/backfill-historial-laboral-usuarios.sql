-- =============================================================================
-- Script para crear historial laboral inicial en usuarios que no lo tienen
-- Ejecutar en pgAdmin (Query Tool)
-- =============================================================================
-- Crea un registro HistorialLaboral para cada usuario de junta que no tenga ninguno.
-- Estado: NO_TRABAJANDO (por defecto). Fecha inicio: fechaCreacion del usuario.
-- Fecha fin: null (vigente). Creado por: el mismo usuario (dato inicial).
-- =============================================================================

DO $$
DECLARE
  v_count INT := 0;
  r RECORD;
BEGIN
  FOR r IN
    SELECT u.id AS usuario_id, u."fechaCreacion", u."juntaId"
    FROM "Usuario" u
    WHERE u."juntaId" IS NOT NULL
      AND u."activo" = true
      AND NOT EXISTS (
        SELECT 1 FROM "HistorialLaboral" h WHERE h."usuarioId" = u.id
      )
  LOOP
    INSERT INTO "HistorialLaboral" (id, "usuarioId", estado, "fechaInicio", "fechaFin", "creadoPorId", "fechaCreacion")
    VALUES (
      gen_random_uuid(),
      r.usuario_id,
      'NO_TRABAJANDO',
      r."fechaCreacion",
      NULL,
      r.usuario_id,
      now()
    );
    v_count := v_count + 1;
  END LOOP;

  RAISE NOTICE 'Historial laboral creado para % usuario(s) que no tenían registro.', v_count;
END $$;

-- =============================================================================
-- VERIFICACIÓN
-- =============================================================================
-- Usuarios que aún no tienen historial (debería estar vacío después del script):
SELECT u.id, u.nombres, u.apellidos, u."fechaCreacion", u."juntaId"
FROM "Usuario" u
WHERE u."juntaId" IS NOT NULL
  AND u."activo" = true
  AND NOT EXISTS (SELECT 1 FROM "HistorialLaboral" h WHERE h."usuarioId" = u.id);
