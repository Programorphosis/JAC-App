-- AlterTable
ALTER TABLE "Carta" ADD COLUMN     "vigenciaHasta" TIMESTAMP(3);

-- AlterTable
ALTER TABLE "Junta" ADD COLUMN     "vigenciaCartaMeses" INTEGER DEFAULT 3;
