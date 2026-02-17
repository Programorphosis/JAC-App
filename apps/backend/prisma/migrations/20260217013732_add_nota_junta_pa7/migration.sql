-- CreateTable
CREATE TABLE "NotaJunta" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "contenido" TEXT NOT NULL,
    "creadoPorId" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "NotaJunta_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "NotaJunta_juntaId_idx" ON "NotaJunta"("juntaId");

-- AddForeignKey
ALTER TABLE "NotaJunta" ADD CONSTRAINT "NotaJunta_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "NotaJunta" ADD CONSTRAINT "NotaJunta_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
