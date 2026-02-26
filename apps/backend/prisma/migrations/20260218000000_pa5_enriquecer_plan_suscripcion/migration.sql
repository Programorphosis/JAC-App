-- PA5-0: Enriquecer Plan y Suscripcion para motor de limites SaaS
-- Referencia: Motor de Límites, Cuotas y Planes Personalizados.md, ROADMAP_PA5_LIMITES.md

-- Plan: nuevos campos
ALTER TABLE "Plan" ADD COLUMN "descripcion" TEXT;
ALTER TABLE "Plan" ADD COLUMN "permiteUsuariosIlimitados" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN "permiteStorageIlimitado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN "permiteCartasIlimitadas" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Plan" ADD COLUMN "esPersonalizable" BOOLEAN NOT NULL DEFAULT false;

-- Planes existentes con limiteX = null: marcar permiteXIlimitado = true (mantener semantica)
UPDATE "Plan" SET "permiteUsuariosIlimitados" = true WHERE "limiteUsuarios" IS NULL;
UPDATE "Plan" SET "permiteStorageIlimitado" = true WHERE "limiteStorageMb" IS NULL;
UPDATE "Plan" SET "permiteCartasIlimitadas" = true WHERE "limiteCartasMes" IS NULL;

-- Suscripcion: nuevos campos
ALTER TABLE "Suscripcion" ADD COLUMN "overrideLimiteUsuarios" INTEGER;
ALTER TABLE "Suscripcion" ADD COLUMN "overrideLimiteStorageMb" INTEGER;
ALTER TABLE "Suscripcion" ADD COLUMN "overrideLimiteCartasMes" INTEGER;
ALTER TABLE "Suscripcion" ADD COLUMN "esPlanPersonalizado" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Suscripcion" ADD COLUMN "precioPersonalizado" DECIMAL(12,2);
ALTER TABLE "Suscripcion" ADD COLUMN "motivoPersonalizacion" TEXT;
ALTER TABLE "Suscripcion" ADD COLUMN "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;
