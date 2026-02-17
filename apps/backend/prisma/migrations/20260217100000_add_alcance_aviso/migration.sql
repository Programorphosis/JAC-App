-- CreateEnum
CREATE TYPE "AlcanceAviso" AS ENUM ('PLATAFORMA', 'TODAS_JUNTAS', 'JUNTA_ESPECIFICA');

-- AlterTable
ALTER TABLE "AvisoPlataforma" ADD COLUMN "alcance" "AlcanceAviso" NOT NULL DEFAULT 'TODAS_JUNTAS';
ALTER TABLE "AvisoPlataforma" ADD COLUMN "juntaId" TEXT;

-- CreateIndex
CREATE INDEX "AvisoPlataforma_alcance_idx" ON "AvisoPlataforma"("alcance");
CREATE INDEX "AvisoPlataforma_juntaId_idx" ON "AvisoPlataforma"("juntaId");

-- AddForeignKey
ALTER TABLE "AvisoPlataforma" ADD CONSTRAINT "AvisoPlataforma_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE SET NULL ON UPDATE CASCADE;
