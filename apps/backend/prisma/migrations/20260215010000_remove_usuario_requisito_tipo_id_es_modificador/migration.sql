-- AlterTable: Remove Usuario.requisitoTipoId and Usuario.esModificador.
-- Source of truth for modificador is RequisitoTipo.modificadorId.
-- A user can now be modificador of multiple requisitos.

-- Drop FK and unique index
ALTER TABLE "Usuario" DROP CONSTRAINT IF EXISTS "Usuario_requisitoTipoId_fkey";
DROP INDEX IF EXISTS "Usuario_requisitoTipoId_key";

-- Drop columns
ALTER TABLE "Usuario" DROP COLUMN IF EXISTS "requisitoTipoId";
ALTER TABLE "Usuario" DROP COLUMN IF EXISTS "esModificador";
