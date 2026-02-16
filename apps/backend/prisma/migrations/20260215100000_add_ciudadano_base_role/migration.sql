-- Rol base: todos los usuarios de una junta son ciudadanos.
-- Agregar CIUDADANO a usuarios existentes que tienen juntaId pero no tienen ese rol.
INSERT INTO "UsuarioRol" ("usuarioId", "rolId")
SELECT u.id, r.id
FROM "Usuario" u
CROSS JOIN "Rol" r
WHERE r.nombre = 'CIUDADANO'
  AND u."juntaId" IS NOT NULL
  AND NOT EXISTS (
    SELECT 1 FROM "UsuarioRol" ur
    INNER JOIN "Rol" rr ON ur."rolId" = rr.id
    WHERE ur."usuarioId" = u.id AND rr.nombre = 'CIUDADANO'
  );
