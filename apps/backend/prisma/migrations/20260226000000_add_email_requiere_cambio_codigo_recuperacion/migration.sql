-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "email" TEXT;
ALTER TABLE "Usuario" ADD COLUMN "requiereCambioPassword" BOOLEAN NOT NULL DEFAULT true;

-- CreateTable
CREATE TABLE "CodigoRecuperacion" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoRecuperacion_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Usuario_email_idx" ON "Usuario"("email");

-- CreateIndex
CREATE INDEX "CodigoRecuperacion_usuarioId_idx" ON "CodigoRecuperacion"("usuarioId");

-- CreateIndex
CREATE INDEX "CodigoRecuperacion_codigo_expiraEn_idx" ON "CodigoRecuperacion"("codigo", "expiraEn");

-- AddForeignKey
ALTER TABLE "CodigoRecuperacion" ADD CONSTRAINT "CodigoRecuperacion_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
