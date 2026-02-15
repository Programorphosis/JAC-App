/**
 * Endpoints públicos - sin autenticación.
 * Referencia: validacionesDeCartaQR.md
 */
import { Controller, Get, Param } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { PrismaService } from '../../prisma/prisma.service';

@Controller('public')
export class PublicController {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * GET /public/validar-carta/:qrToken
   * Verificación pública de carta por QR. Sin autenticación.
   */
  @Get('validar-carta/:qrToken')
  @Throttle({ default: { limit: 30, ttl: 60_000 } }) // 30 consultas/min por IP
  async validarCarta(@Param('qrToken') qrToken: string) {
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

    if (!carta) {
      const cartaExiste = await this.prisma.carta.findUnique({
        where: { qrToken },
        select: { estado: true, vigenciaHasta: true },
      });
      const ahora = new Date();
      if (cartaExiste?.estado === 'APROBADA' && cartaExiste.vigenciaHasta && cartaExiste.vigenciaHasta < ahora) {
        return {
          valida: false,
          mensaje: 'Carta vencida',
        };
      }
      return {
        valida: false,
        mensaje: 'Carta no encontrada o no válida',
      };
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

    return {
      valida: true,
      nombre: `${carta.usuario.nombres} ${carta.usuario.apellidos}`,
      documentoParcial,
      fechaEmision: carta.fechaEmision,
      vigenciaHasta: (carta as { vigenciaHasta?: Date }).vigenciaHasta ?? null,
      junta: carta.junta.nombre,
      consecutivo: carta.consecutivo,
      anio: carta.anio,
    };
  }
}
