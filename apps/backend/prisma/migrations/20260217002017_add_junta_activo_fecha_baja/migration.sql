-- AlterTable
ALTER TABLE "Junta" ADD COLUMN     "activo" BOOLEAN NOT NULL DEFAULT true,
ADD COLUMN     "fechaBaja" TIMESTAMP(3);
