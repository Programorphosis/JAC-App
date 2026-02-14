-- AlterTable: Carta.consecutivo opcional para cartas PENDIENTE
-- En PENDIENTE: consecutivo=null. Al aprobar: se asigna consecutivo anual.

ALTER TABLE "Carta" ALTER COLUMN "consecutivo" DROP NOT NULL;
