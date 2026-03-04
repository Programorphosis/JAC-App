-- Junta: email y telefono obligatorios
-- Rellenar nulls antes de NOT NULL (para DB existentes; si se resetea, no aplica)
UPDATE "Junta" SET email = 'pendiente@junta.local' WHERE email IS NULL;
UPDATE "Junta" SET telefono = '+570000000000' WHERE telefono IS NULL;

ALTER TABLE "Junta" ALTER COLUMN "email" SET NOT NULL;
ALTER TABLE "Junta" ALTER COLUMN "telefono" SET NOT NULL;

-- Usuario: emailVerificado y @@unique([email])
ALTER TABLE "Usuario" ADD COLUMN IF NOT EXISTS "emailVerificado" BOOLEAN NOT NULL DEFAULT false;

-- Resolver duplicados de email: mantener solo el primero por email (por fechaCreacion), el resto a NULL
WITH duplicados AS (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY email ORDER BY "fechaCreacion" ASC) AS rn
  FROM "Usuario"
  WHERE email IS NOT NULL
)
UPDATE "Usuario"
SET email = NULL
WHERE id IN (SELECT id FROM duplicados WHERE rn > 1);

-- Reemplazar índice por unique (drop index si existe, add unique)
DROP INDEX IF EXISTS "Usuario_email_idx";
CREATE UNIQUE INDEX IF NOT EXISTS "Usuario_email_key" ON "Usuario"("email");

-- CodigoVerificacionEmail para flujo de verificación de correo (cambiar password primer login)
CREATE TABLE IF NOT EXISTS "CodigoVerificacionEmail" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "codigo" TEXT NOT NULL,
    "expiraEn" TIMESTAMP(3) NOT NULL,
    "usado" BOOLEAN NOT NULL DEFAULT false,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "CodigoVerificacionEmail_pkey" PRIMARY KEY ("id")
);

CREATE INDEX IF NOT EXISTS "CodigoVerificacionEmail_usuarioId_idx" ON "CodigoVerificacionEmail"("usuarioId");
CREATE INDEX IF NOT EXISTS "CodigoVerificacionEmail_usuarioId_codigo_idx" ON "CodigoVerificacionEmail"("usuarioId", "codigo");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CodigoVerificacionEmail_usuarioId_fkey'
  ) THEN
    ALTER TABLE "CodigoVerificacionEmail" ADD CONSTRAINT "CodigoVerificacionEmail_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
