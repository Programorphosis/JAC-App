-- CreateTable
-- IntencionPagoFactura: pago online de facturas plataforma (junta → plataforma)
-- FACTURACION_PLATAFORMA_PAGO_ONLINE_ANALISIS.md
CREATE TABLE "IntencionPagoFactura" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "montoCents" INTEGER NOT NULL,
    "wompiLinkId" TEXT NOT NULL,
    "iniciadoPorId" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "IntencionPagoFactura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "IntencionPagoFactura_wompiLinkId_key" ON "IntencionPagoFactura"("wompiLinkId");

-- CreateIndex
CREATE INDEX "IntencionPagoFactura_juntaId_idx" ON "IntencionPagoFactura"("juntaId");

-- CreateIndex
CREATE INDEX "IntencionPagoFactura_facturaId_idx" ON "IntencionPagoFactura"("facturaId");

-- AddForeignKey
ALTER TABLE "IntencionPagoFactura" ADD CONSTRAINT "IntencionPagoFactura_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntencionPagoFactura" ADD CONSTRAINT "IntencionPagoFactura_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "IntencionPagoFactura" ADD CONSTRAINT "IntencionPagoFactura_iniciadoPorId_fkey" FOREIGN KEY ("iniciadoPorId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
