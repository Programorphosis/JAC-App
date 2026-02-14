-- Refactor: EstadoAgua/HistorialAgua -> RequisitoTipo, EstadoRequisito, HistorialRequisito
-- Migración de datos incluida

-- 1. Crear nuevos enums (mismos valores que EstadoAguaTipo, TipoCambioAgua)
CREATE TYPE "EstadoRequisitoTipo" AS ENUM ('AL_DIA', 'MORA');
CREATE TYPE "TipoCambioRequisito" AS ENUM ('ESTADO', 'OBLIGACION');

-- 2. Crear tabla RequisitoTipo
CREATE TABLE "RequisitoTipo" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "modificadorId" TEXT,
    "tieneCorteAutomatico" BOOLEAN NOT NULL DEFAULT true,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "RequisitoTipo_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "RequisitoTipo_juntaId_idx" ON "RequisitoTipo"("juntaId");

ALTER TABLE "RequisitoTipo" ADD CONSTRAINT "RequisitoTipo_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "RequisitoTipo" ADD CONSTRAINT "RequisitoTipo_modificadorId_fkey" FOREIGN KEY ("modificadorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 3. Por cada junta: crear RequisitoTipo "agua" con modificadorId = primer usuario RECEPTOR_AGUA (o null)
INSERT INTO "RequisitoTipo" ("id", "juntaId", "nombre", "modificadorId", "tieneCorteAutomatico", "activo")
SELECT
    gen_random_uuid(),
    j."id",
    'agua',
    (
        SELECT u."id"
        FROM "Usuario" u
        JOIN "UsuarioRol" ur ON ur."usuarioId" = u."id"
        JOIN "Rol" r ON r."id" = ur."rolId"
        WHERE u."juntaId" = j."id" AND r."nombre" = 'RECEPTOR_AGUA'
        LIMIT 1
    ),
    true,
    true
FROM "Junta" j;

-- 4. Crear tabla EstadoRequisito y migrar datos desde EstadoAgua
CREATE TABLE "EstadoRequisito" (
    "usuarioId" TEXT NOT NULL,
    "requisitoTipoId" TEXT NOT NULL,
    "estado" "EstadoRequisitoTipo" NOT NULL,
    "obligacionActiva" BOOLEAN NOT NULL DEFAULT true,
    "fechaUltimoCambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstadoRequisito_pkey" PRIMARY KEY ("usuarioId","requisitoTipoId")
);

CREATE INDEX "EstadoRequisito_requisitoTipoId_idx" ON "EstadoRequisito"("requisitoTipoId");

INSERT INTO "EstadoRequisito" ("usuarioId", "requisitoTipoId", "estado", "obligacionActiva", "fechaUltimoCambio")
SELECT
    ea."usuarioId",
    rt."id",
    ea."estado"::text::"EstadoRequisitoTipo",
    ea."obligacionActiva",
    ea."fechaUltimoCambio"
FROM "EstadoAgua" ea
JOIN "Usuario" u ON u."id" = ea."usuarioId"
JOIN "RequisitoTipo" rt ON rt."juntaId" = u."juntaId" AND rt."nombre" = 'agua'
WHERE u."juntaId" IS NOT NULL;

ALTER TABLE "EstadoRequisito" ADD CONSTRAINT "EstadoRequisito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "EstadoRequisito" ADD CONSTRAINT "EstadoRequisito_requisitoTipoId_fkey" FOREIGN KEY ("requisitoTipoId") REFERENCES "RequisitoTipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- 5. Crear tabla HistorialRequisito y migrar datos desde HistorialAgua
CREATE TABLE "HistorialRequisito" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "requisitoTipoId" TEXT NOT NULL,
    "tipoCambio" "TipoCambioRequisito" NOT NULL,
    "estadoAnterior" "EstadoRequisitoTipo",
    "estadoNuevo" "EstadoRequisitoTipo",
    "obligacionAnterior" BOOLEAN,
    "obligacionNueva" BOOLEAN,
    "cambiadoPorId" TEXT,
    "cambioAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "fechaCambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialRequisito_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HistorialRequisito_usuarioId_idx" ON "HistorialRequisito"("usuarioId");
CREATE INDEX "HistorialRequisito_requisitoTipoId_idx" ON "HistorialRequisito"("requisitoTipoId");

INSERT INTO "HistorialRequisito" ("id", "usuarioId", "requisitoTipoId", "tipoCambio", "estadoAnterior", "estadoNuevo", "obligacionAnterior", "obligacionNueva", "cambiadoPorId", "cambioAutomatico", "fechaCambio")
SELECT
    ha."id",
    ha."usuarioId",
    rt."id",
    ha."tipoCambio"::text::"TipoCambioRequisito",
    ha."estadoAnterior"::text::"EstadoRequisitoTipo",
    ha."estadoNuevo"::text::"EstadoRequisitoTipo",
    ha."obligacionAnterior",
    ha."obligacionNueva",
    ha."cambiadoPorId",
    ha."cambioAutomatico",
    ha."fechaCambio"
FROM "HistorialAgua" ha
JOIN "Usuario" u ON u."id" = ha."usuarioId"
JOIN "RequisitoTipo" rt ON rt."juntaId" = u."juntaId" AND rt."nombre" = 'agua'
WHERE u."juntaId" IS NOT NULL;

ALTER TABLE "HistorialRequisito" ADD CONSTRAINT "HistorialRequisito_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistorialRequisito" ADD CONSTRAINT "HistorialRequisito_requisitoTipoId_fkey" FOREIGN KEY ("requisitoTipoId") REFERENCES "RequisitoTipo"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "HistorialRequisito" ADD CONSTRAINT "HistorialRequisito_cambiadoPorId_fkey" FOREIGN KEY ("cambiadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- 6. Eliminar tablas antiguas
DROP TABLE "HistorialAgua";
DROP TABLE "EstadoAgua";

-- 7. Eliminar enums antiguos
DROP TYPE "TipoCambioAgua";
DROP TYPE "EstadoAguaTipo";
