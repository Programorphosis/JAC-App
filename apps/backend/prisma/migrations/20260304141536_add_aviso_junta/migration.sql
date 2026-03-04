-- CreateTable
CREATE TABLE "AvisoJunta" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "titulo" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "fechaPublicacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "creadoPorId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AvisoJunta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "AvisoJunta_juntaId_idx" ON "AvisoJunta"("juntaId");

-- CreateIndex
CREATE INDEX "AvisoJunta_juntaId_activo_idx" ON "AvisoJunta"("juntaId", "activo");

-- AddForeignKey
ALTER TABLE "AvisoJunta" ADD CONSTRAINT "AvisoJunta_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AvisoJunta" ADD CONSTRAINT "AvisoJunta_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;
