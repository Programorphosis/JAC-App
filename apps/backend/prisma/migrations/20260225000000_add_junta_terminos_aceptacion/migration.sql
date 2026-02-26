-- Add terminos acceptance fields to Junta for legal compliance (Ley 527)
ALTER TABLE "Junta" ADD COLUMN "terminosAceptadosEn" TIMESTAMP(3);
ALTER TABLE "Junta" ADD COLUMN "terminosVersion" TEXT;
