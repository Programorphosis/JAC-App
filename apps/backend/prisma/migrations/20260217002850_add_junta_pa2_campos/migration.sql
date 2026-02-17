-- AlterTable
ALTER TABLE "Junta" ADD COLUMN     "ciudad" TEXT,
ADD COLUMN     "departamento" TEXT,
ADD COLUMN     "direccion" TEXT,
ADD COLUMN     "email" TEXT,
ADD COLUMN     "enMantenimiento" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "telefono" TEXT;
