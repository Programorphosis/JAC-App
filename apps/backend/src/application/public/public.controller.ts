/**
 * Endpoints públicos - sin autenticación.
 * Referencia: validacionesDeCartaQR.md
 */
import { Controller, Get, Param, Req, Res } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { Request, Response } from 'express';
import { PrismaService } from '../../prisma/prisma.service';

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildHtmlPage(data: {
  valida: boolean;
  mensaje?: string;
  nombre?: string;
  documentoParcial?: string;
  fechaEmision?: string;
  vigenciaHasta?: string | null;
  junta?: string;
  consecutivo?: number;
  anio?: number;
}): string {
  const titulo = data.valida ? 'Carta válida' : 'Carta no válida';
  const fechaEm = data.fechaEmision
    ? new Date(data.fechaEmision).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : '';
  const vigencia = data.vigenciaHasta
    ? new Date(data.vigenciaHasta).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' })
    : 'Sin vencimiento';

  if (!data.valida) {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(titulo)}</title>
  <style>
    *{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:2rem auto;padding:1rem;background:#f5f5f5;color:#333}
    .card{background:#fff;border-radius:8px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.1)}
    .icon{font-size:3rem;text-align:center;color:#c62828;margin-bottom:.5rem}
    h1{font-size:1.25rem;margin:0 0 1rem;color:#c62828}
    p{margin:0;color:#666}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10008;</div>
    <h1>${escapeHtml(titulo)}</h1>
    <p>${escapeHtml(data.mensaje ?? 'Carta no encontrada o no válida')}</p>
  </div>
</body>
</html>`;
  }

  return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>${escapeHtml(titulo)}</title>
  <style>
    *{box-sizing:border-box}body{font-family:system-ui,-apple-system,sans-serif;max-width:480px;margin:2rem auto;padding:1rem;background:#f5f5f5;color:#333}
    .card{background:#fff;border-radius:8px;padding:1.5rem;box-shadow:0 1px 3px rgba(0,0,0,.1)}
    .icon{font-size:3rem;text-align:center;color:#2e7d32;margin-bottom:.5rem}
    h1{font-size:1.25rem;margin:0 0 1rem;color:#2e7d32}
    dl{margin:0;display:grid;gap:.5rem}
    dt{font-weight:600;color:#555}
    dd{margin:0;color:#333}
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">&#10004;</div>
    <h1>${escapeHtml(titulo)}</h1>
    <dl>
      <dt>Nombre</dt><dd>${escapeHtml(data.nombre ?? '')}</dd>
      <dt>Documento</dt><dd>${escapeHtml(data.documentoParcial ?? '')}</dd>
      <dt>Fecha de emisión</dt><dd>${escapeHtml(fechaEm)}</dd>
      <dt>Vigencia hasta</dt><dd>${escapeHtml(vigencia)}</dd>
      <dt>Junta emisora</dt><dd>${escapeHtml(data.junta ?? '')}</dd>
      <dt>Consecutivo</dt><dd>${data.consecutivo ?? ''} / ${data.anio ?? ''}</dd>
    </dl>
  </div>
</body>
</html>`;
}

@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /public/planes
   * Lista planes activos para la landing. Sin autenticación.
   */
  @Get('planes')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  async listarPlanes() {
    const planes = await this.prisma.plan.findMany({
      where: { activo: true },
      select: {
        id: true,
        nombre: true,
        descripcion: true,
        precioMensual: true,
        precioAnual: true,
        limiteUsuarios: true,
        limiteStorageMb: true,
        limiteCartasMes: true,
        permiteUsuariosIlimitados: true,
        permiteStorageIlimitado: true,
        permiteCartasIlimitadas: true,
        diasPrueba: true,
      },
      orderBy: { precioMensual: 'asc' },
    });
    return { data: planes };
  }

  /**
   * GET /public/validar-carta/:qrToken
   * Verificación pública de carta por QR. Sin autenticación.
   * Devuelve HTML si el navegador lo solicita (Accept: text/html), JSON en caso contrario.
   */
  @Get('validar-carta/:qrToken')
  @Throttle({ default: { limit: 30, ttl: 60_000 } }) // 30 consultas/min por IP
  async validarCarta(
    @Param('qrToken') qrToken: string,
    @Req() req: Request,
    @Res({ passthrough: false }) res: Response,
  ) {
    const ahora = new Date();
    const carta = await this.prisma.carta.findFirst({
      where: {
        qrToken,
        estado: 'APROBADA',
        OR: [
          { vigenciaHasta: null },
          { vigenciaHasta: { gte: ahora } },
        ],
      },
      include: {
        usuario: {
          select: {
            nombres: true,
            apellidos: true,
            numeroDocumento: true,
          },
        },
        junta: {
          select: { nombre: true },
        },
      },
    });

    const wantsHtml = req.accepts('text/html');

    if (!carta) {
      const cartaExiste = await this.prisma.carta.findUnique({
        where: { qrToken },
        select: { estado: true, vigenciaHasta: true },
      });
      const ahora = new Date();
      const payload =
        cartaExiste?.estado === 'APROBADA' && cartaExiste.vigenciaHasta && cartaExiste.vigenciaHasta < ahora
          ? { valida: false, mensaje: 'Carta vencida' }
          : { valida: false, mensaje: 'Carta no encontrada o no válida' };
      if (wantsHtml) {
        res.type('text/html').send(buildHtmlPage(payload));
        return;
      }
      return res.json(payload);
    }

    const documentoParcial =
      carta.usuario.numeroDocumento.length > 4
        ? `****${carta.usuario.numeroDocumento.slice(-4)}`
        : '****';

    await this.prisma.auditoria.create({
      data: {
        juntaId: carta.juntaId,
        entidad: 'Carta',
        entidadId: carta.id,
        accion: 'CONSULTA_VALIDACION_PUBLICA',
        metadata: { qrToken, origen: 'publico' },
        ejecutadoPorId: carta.emitidaPorId ?? carta.usuarioId,
      },
    });

    const vigenciaHasta = (carta as { vigenciaHasta?: Date }).vigenciaHasta ?? null;
    const payload = {
      valida: true,
      nombre: `${carta.usuario.nombres} ${carta.usuario.apellidos}`,
      documentoParcial,
      fechaEmision: carta.fechaEmision?.toISOString(),
      vigenciaHasta: vigenciaHasta?.toISOString() ?? null,
      junta: carta.junta.nombre,
      consecutivo: carta.consecutivo ?? undefined,
      anio: carta.anio,
    };
    if (wantsHtml) {
      res.type('text/html').send(buildHtmlPage(payload));
      return;
    }
    return res.json(payload);
  }
}
