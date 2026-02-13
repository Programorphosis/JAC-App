-- AlterTable: agregar passwordHash a Usuario
ALTER TABLE "Usuario" ADD COLUMN "passwordHash" TEXT NOT NULL DEFAULT '';

-- Actualizar registros existentes: si hay usuarios sin password, usar un hash inválido (no debería haber usuarios en bootstrap)
-- En desarrollo inicial la tabla está vacía, así que no hay problema.
-- Para producción: los usuarios se crean con password desde el inicio.

-- Remover default después de agregar (para que nuevos usuarios deban tener password)
ALTER TABLE "Usuario" ALTER COLUMN "passwordHash" DROP DEFAULT;

-- Seed: insertar roles base (solo si no existen)
INSERT INTO "Rol" ("id", "nombre")
SELECT gen_random_uuid(), 'PLATFORM_ADMIN'::"RolNombre" WHERE NOT EXISTS (SELECT 1 FROM "Rol" WHERE "nombre" = 'PLATFORM_ADMIN');
INSERT INTO "Rol" ("id", "nombre")
SELECT gen_random_uuid(), 'ADMIN'::"RolNombre" WHERE NOT EXISTS (SELECT 1 FROM "Rol" WHERE "nombre" = 'ADMIN');
INSERT INTO "Rol" ("id", "nombre")
SELECT gen_random_uuid(), 'SECRETARIA'::"RolNombre" WHERE NOT EXISTS (SELECT 1 FROM "Rol" WHERE "nombre" = 'SECRETARIA');
INSERT INTO "Rol" ("id", "nombre")
SELECT gen_random_uuid(), 'TESORERA'::"RolNombre" WHERE NOT EXISTS (SELECT 1 FROM "Rol" WHERE "nombre" = 'TESORERA');
INSERT INTO "Rol" ("id", "nombre")
SELECT gen_random_uuid(), 'RECEPTOR_AGUA'::"RolNombre" WHERE NOT EXISTS (SELECT 1 FROM "Rol" WHERE "nombre" = 'RECEPTOR_AGUA');
INSERT INTO "Rol" ("id", "nombre")
SELECT gen_random_uuid(), 'CIUDADANO'::"RolNombre" WHERE NOT EXISTS (SELECT 1 FROM "Rol" WHERE "nombre" = 'CIUDADANO');
