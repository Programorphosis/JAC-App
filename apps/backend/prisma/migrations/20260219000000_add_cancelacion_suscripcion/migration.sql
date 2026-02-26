-- Cancelación al final del período para suscripciones SaaS.
-- La suscripción permanece ACTIVA hasta fechaVencimiento; el cron de renovación la omite.
ALTER TABLE "Suscripcion" ADD COLUMN "cancelacionSolicitada" BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE "Suscripcion" ADD COLUMN "fechaCancelacionSolicitada" TIMESTAMP(3);
