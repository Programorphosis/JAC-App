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
    const carta = await this.prisma.carta.findUnique({
      where: { qrToken, estado: 'APROBADA' },
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
      junta: carta.junta.nombre,
      consecutivo: carta.consecutivo,
      anio: carta.anio,
    };
  }
}
