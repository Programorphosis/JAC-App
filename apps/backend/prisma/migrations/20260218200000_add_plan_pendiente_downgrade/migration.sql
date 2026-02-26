-- AlterTable
ALTER TABLE "Suscripcion" ADD COLUMN "planIdPendiente" TEXT;
ALTER TABLE "Suscripcion" ADD COLUMN "periodoPendiente" TEXT;

-- AddForeignKey
ALTER TABLE "Suscripcion" ADD CONSTRAINT "Suscripcion_planIdPendiente_fkey" FOREIGN KEY ("planIdPendiente") REFERENCES "Plan"("id") ON DELETE SET NULL ON UPDATE CASCADE;
