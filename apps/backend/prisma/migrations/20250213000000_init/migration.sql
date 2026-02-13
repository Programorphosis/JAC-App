-- CreateEnum
CREATE TYPE "RolNombre" AS ENUM ('PLATFORM_ADMIN', 'ADMIN', 'SECRETARIA', 'TESORERA', 'RECEPTOR_AGUA', 'CIUDADANO');
CREATE TYPE "EstadoLaboralTipo" AS ENUM ('TRABAJANDO', 'NO_TRABAJANDO');
CREATE TYPE "MetodoPago" AS ENUM ('EFECTIVO', 'TRANSFERENCIA', 'ONLINE');
CREATE TYPE "TipoPago" AS ENUM ('JUNTA', 'CARTA');
CREATE TYPE "EstadoAguaTipo" AS ENUM ('AL_DIA', 'MORA');
CREATE TYPE "EstadoCartaTipo" AS ENUM ('PENDIENTE', 'APROBADA', 'RECHAZADA');
CREATE TYPE "TipoCambioAgua" AS ENUM ('ESTADO', 'OBLIGACION');

-- CreateTable
CREATE TABLE "Junta" (
    "id" TEXT NOT NULL,
    "nombre" TEXT NOT NULL,
    "nit" TEXT,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "montoCarta" INTEGER,

    CONSTRAINT "Junta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Junta_nit_key" ON "Junta"("nit");

CREATE TABLE "Usuario" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT,
    "tipoDocumento" TEXT NOT NULL,
    "numeroDocumento" TEXT NOT NULL,
    "nombres" TEXT NOT NULL,
    "apellidos" TEXT NOT NULL,
    "telefono" TEXT,
    "direccion" TEXT,
    "activo" BOOLEAN NOT NULL DEFAULT true,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Usuario_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Usuario_juntaId_idx" ON "Usuario"("juntaId");
CREATE UNIQUE INDEX "Usuario_juntaId_numeroDocumento_key" ON "Usuario"("juntaId", "numeroDocumento");

CREATE TABLE "Rol" (
    "id" TEXT NOT NULL,
    "nombre" "RolNombre" NOT NULL,

    CONSTRAINT "Rol_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Rol_nombre_key" ON "Rol"("nombre");

CREATE TABLE "UsuarioRol" (
    "usuarioId" TEXT NOT NULL,
    "rolId" TEXT NOT NULL,

    CONSTRAINT "UsuarioRol_pkey" PRIMARY KEY ("usuarioId","rolId")
);

CREATE TABLE "HistorialLaboral" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "estado" "EstadoLaboralTipo" NOT NULL,
    "fechaInicio" TIMESTAMP(3) NOT NULL,
    "fechaFin" TIMESTAMP(3),
    "creadoPorId" TEXT NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialLaboral_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HistorialLaboral_usuarioId_idx" ON "HistorialLaboral"("usuarioId");

CREATE TABLE "Tarifa" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "estadoLaboral" "EstadoLaboralTipo" NOT NULL,
    "valorMensual" INTEGER NOT NULL,
    "fechaVigencia" TIMESTAMP(3) NOT NULL,
    "fechaCreacion" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Tarifa_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Tarifa_juntaId_estadoLaboral_fechaVigencia_idx" ON "Tarifa"("juntaId", "estadoLaboral", "fechaVigencia");

CREATE TABLE "Pago" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" "TipoPago" NOT NULL,
    "metodo" "MetodoPago" NOT NULL,
    "monto" INTEGER NOT NULL,
    "consecutivo" INTEGER NOT NULL,
    "referenciaExterna" TEXT,
    "registradoPorId" TEXT NOT NULL,
    "fechaPago" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Pago_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Pago_referenciaExterna_key" ON "Pago"("referenciaExterna");
CREATE UNIQUE INDEX "Pago_juntaId_tipo_consecutivo_key" ON "Pago"("juntaId", "tipo", "consecutivo");
CREATE INDEX "Pago_juntaId_idx" ON "Pago"("juntaId");
CREATE INDEX "Pago_usuarioId_idx" ON "Pago"("usuarioId");

CREATE TABLE "EstadoAgua" (
    "usuarioId" TEXT NOT NULL,
    "estado" "EstadoAguaTipo" NOT NULL,
    "obligacionActiva" BOOLEAN NOT NULL DEFAULT true,
    "fechaUltimoCambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "EstadoAgua_pkey" PRIMARY KEY ("usuarioId")
);

CREATE INDEX "EstadoAgua_obligacionActiva_idx" ON "EstadoAgua"("obligacionActiva");

CREATE TABLE "HistorialAgua" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipoCambio" "TipoCambioAgua" NOT NULL,
    "estadoAnterior" "EstadoAguaTipo",
    "estadoNuevo" "EstadoAguaTipo",
    "obligacionAnterior" BOOLEAN,
    "obligacionNueva" BOOLEAN,
    "cambiadoPorId" TEXT,
    "cambioAutomatico" BOOLEAN NOT NULL DEFAULT false,
    "fechaCambio" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "HistorialAgua_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "HistorialAgua_usuarioId_idx" ON "HistorialAgua"("usuarioId");

CREATE TABLE "Carta" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "consecutivo" INTEGER NOT NULL,
    "anio" INTEGER NOT NULL,
    "estado" "EstadoCartaTipo" NOT NULL,
    "qrToken" TEXT NOT NULL,
    "fechaSolicitud" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "fechaEmision" TIMESTAMP(3),
    "emitidaPorId" TEXT,
    "rutaPdf" TEXT,
    "hashDocumento" TEXT,
    "motivoRechazo" TEXT,

    CONSTRAINT "Carta_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Carta_qrToken_key" ON "Carta"("qrToken");
CREATE UNIQUE INDEX "Carta_juntaId_anio_consecutivo_key" ON "Carta"("juntaId", "anio", "consecutivo");
CREATE INDEX "Carta_juntaId_idx" ON "Carta"("juntaId");
CREATE INDEX "Carta_usuarioId_idx" ON "Carta"("usuarioId");

CREATE TABLE "Documento" (
    "id" TEXT NOT NULL,
    "usuarioId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "rutaS3" TEXT NOT NULL,
    "subidoPorId" TEXT NOT NULL,
    "fechaSubida" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Documento_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Documento_usuarioId_idx" ON "Documento"("usuarioId");

CREATE TABLE "Consecutivo" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "tipo" TEXT NOT NULL,
    "anio" INTEGER NOT NULL,
    "valorActual" INTEGER NOT NULL,

    CONSTRAINT "Consecutivo_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "Consecutivo_juntaId_tipo_anio_key" ON "Consecutivo"("juntaId", "tipo", "anio");

CREATE TABLE "Auditoria" (
    "id" TEXT NOT NULL,
    "juntaId" TEXT NOT NULL,
    "entidad" TEXT NOT NULL,
    "entidadId" TEXT NOT NULL,
    "accion" TEXT NOT NULL,
    "metadata" JSONB NOT NULL,
    "ejecutadoPorId" TEXT NOT NULL,
    "fecha" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Auditoria_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "Auditoria_juntaId_idx" ON "Auditoria"("juntaId");
CREATE INDEX "Auditoria_entidad_idx" ON "Auditoria"("entidad");

-- AddForeignKey
ALTER TABLE "Usuario" ADD CONSTRAINT "Usuario_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "UsuarioRol" ADD CONSTRAINT "UsuarioRol_rolId_fkey" FOREIGN KEY ("rolId") REFERENCES "Rol"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HistorialLaboral" ADD CONSTRAINT "HistorialLaboral_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistorialLaboral" ADD CONSTRAINT "HistorialLaboral_creadoPorId_fkey" FOREIGN KEY ("creadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Tarifa" ADD CONSTRAINT "Tarifa_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Pago" ADD CONSTRAINT "Pago_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Pago" ADD CONSTRAINT "Pago_registradoPorId_fkey" FOREIGN KEY ("registradoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "EstadoAgua" ADD CONSTRAINT "EstadoAgua_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "HistorialAgua" ADD CONSTRAINT "HistorialAgua_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "HistorialAgua" ADD CONSTRAINT "HistorialAgua_cambiadoPorId_fkey" FOREIGN KEY ("cambiadoPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Carta" ADD CONSTRAINT "Carta_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Carta" ADD CONSTRAINT "Carta_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Carta" ADD CONSTRAINT "Carta_emitidaPorId_fkey" FOREIGN KEY ("emitidaPorId") REFERENCES "Usuario"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Documento" ADD CONSTRAINT "Documento_usuarioId_fkey" FOREIGN KEY ("usuarioId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Documento" ADD CONSTRAINT "Documento_subidoPorId_fkey" FOREIGN KEY ("subidoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Consecutivo" ADD CONSTRAINT "Consecutivo_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_juntaId_fkey" FOREIGN KEY ("juntaId") REFERENCES "Junta"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Auditoria" ADD CONSTRAINT "Auditoria_ejecutadoPorId_fkey" FOREIGN KEY ("ejecutadoPorId") REFERENCES "Usuario"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
