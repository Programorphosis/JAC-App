-- CreateEnum
CREATE TYPE "TipoIntencionPago" AS ENUM ('JUNTA', 'CARTA');

-- AlterTable
ALTER TABLE "IntencionPago" ADD COLUMN "tipoPago" "TipoIntencionPago" NOT NULL DEFAULT 'JUNTA';
