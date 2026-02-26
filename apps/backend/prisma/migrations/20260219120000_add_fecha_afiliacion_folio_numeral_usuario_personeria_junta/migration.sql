-- AlterTable
ALTER TABLE "Usuario" ADD COLUMN "fechaAfiliacion" TIMESTAMP(3),
ADD COLUMN "folio" INTEGER,
ADD COLUMN "numeral" INTEGER;

-- AlterTable
ALTER TABLE "Junta" ADD COLUMN "personeriaJuridica" TEXT;
