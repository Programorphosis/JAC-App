-- AlterTable
-- WOMPI_POR_JUNTA_DOC: credenciales Wompi por junta (encriptadas en BD)
ALTER TABLE "Junta" ADD COLUMN     "wompiPrivateKey" TEXT,
ADD COLUMN     "wompiPublicKey" TEXT,
ADD COLUMN     "wompiIntegritySecret" TEXT,
ADD COLUMN     "wompiEventsSecret" TEXT,
ADD COLUMN     "wompiEnvironment" TEXT;
