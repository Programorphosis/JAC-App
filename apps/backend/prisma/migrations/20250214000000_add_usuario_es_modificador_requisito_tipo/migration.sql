-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "esModificador" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "Usuario" ADD COLUMN "requisitoTipoId" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "Usuario_requisitoTipoId_key" ON "Usuario"("requisitoTipoId");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_requisitoTipoId_fkey" FOREIGN KEY ("requisitoTipoId") REFERENCES "RequisitoTipo"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Sincronizar datos existentes: usuarios que ya son modificadorId en algún RequisitoTipo
-- (si un usuario es modificador de varios, se toma el primero)
UPDATE "Usuario" u
SET "esModificador" = true, "requisitoTipoId" = sub.id
FROM (
  SELECT DISTINCT ON ("modificadorId") "modificadorId", id
  FROM "RequisitoTipo"
  WHERE "modificadorId" IS NOT NULL
  ORDER BY "modificadorId", id
) sub
WHERE u.id = sub."modificadorId";
