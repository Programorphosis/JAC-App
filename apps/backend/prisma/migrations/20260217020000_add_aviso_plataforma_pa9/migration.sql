-- CreateTable
CREATE TABLE "AvisoPlataforma" (
    "id" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "fechaPublicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AvisoPlataforma_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvisoPlataforma_activo_idx" ON "AvisoPlataforma"("activo");
