-- CreateEnum
CREATE TYPE "EstadoFactura" AS ENUM ('PENDIENTE', 'PAGADA', 'PARCIAL', 'VENCIDA', 'CANCELADA');

-- CreateEnum
CREATE TYPE "TipoFactura" AS ENUM ('MENSUAL', 'MANUAL', 'AJUSTE');

-- CreateEnum
CREATE TYPE "MetodoPagoFactura" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'ONLINE', 'CHEQUE', 'OTRO');

-- CreateTable
CREATE TABLE "Factura" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "suscripcionId" TEXT,
    "monto" INTEGER NOT NULL,
    "fechaEmision" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaVencimiento" TIMESTAMP(3) NOT NULL,
    "estado" "EstadoFactura" NOT NULL DEFAULT 'PENDIENTE',
    "tipo" "TipoFactura" NOT NULL DEFAULT 'MENSUAL',
    "referenciaExterna" TEXT,
    "metadata" JSONB,
    "creadoPorId" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Factura_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "PagoFactura" (
    "id" TEXT NOT NULL,
    "facturaId" TEXT NOT NULL,
    "monto" INTEGER NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "metodo" "MetodoPagoFactura" NOT NULL,
    "referencia" TEXT,
    "referenciaExterna" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "PagoFactura_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "Factura_juntaId_idx" ON "Factura"("juntaId");

-- CreateIndex
CREATE INDEX "Factura_suscripcionId_idx" ON "Factura"("suscripcionId");

-- CreateIndex
CREATE INDEX "Factura_estado_idx" ON "Factura"("estado");

-- CreateIndex
CREATE INDEX "Factura_fechaEmision_idx" ON "Factura"("fechaEmision");

-- CreateIndex
CREATE INDEX "PagoFactura_facturaId_idx" ON "PagoFactura"("facturaId");

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_suscripcionId_fkey" FOREIGN KEY ("suscripcionId") REFERENCES "Suscripcion"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Factura" ADD CONSTRAINT "Factura_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "PagoFactura" ADD CONSTRAINT "PagoFactura_facturaId_fkey" FOREIGN KEY ("facturaId") REFERENCES "Factura"("id") ON DELETE CASCADE ON UPDATE CASCADE;
