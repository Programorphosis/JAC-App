-- Seed: insertar rol FISCAL si no existe (después de que el enum esté comprometido)
INSERT INTO "Rol" ("id", "nombre")
SELECT gen_random_uuid(), 'FISCAL'::"RolNombre"
WHERE NOT EXISTS (SELECT 1 FROM "Rol" WHERE "nombre" = 'FISCAL');
