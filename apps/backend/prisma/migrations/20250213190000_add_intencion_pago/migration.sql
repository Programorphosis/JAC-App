-- CreateTable
CREATE TABLE "IntencionPago" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "montoCents" INTEGER NOT NULL,
    "wompiLinkId" TEXT NOT NULL,
    "referencia" TEXT NOT NULL,
    "iniciadoPorId" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntencionPago_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntencionPago_wompiLinkId_key" ON "IntencionPago"("wompiLinkId");

-- CreateIndex
CREATE INDEX "IntencionPago_juntaId_idx" ON "IntencionPago"("juntaId");

-- CreateIndex
CREATE INDEX "IntencionPago_usuarioId_idx" ON "IntencionPago"("usuarioId");

-- AddForeignKey
ALTER TABLE "IntencionPago" ADD CONSTRAINT "IntencionPago_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntencionPago" ADD CONSTRAINT "IntencionPago_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntencionPago" ADD CONSTRAINT "IntencionPago_iniciadoPorId_fkey" FOREIGN KEY ("iniciadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
