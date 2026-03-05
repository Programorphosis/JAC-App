/**
 * Implementación Prisma de IEstadoGeneralDataProvider.
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoPago } from '@prisma/client';
import type { IEstadoGeneralDataProvider } from '../../domain/ports/estado-general-data-provider.port';

@Injectable()
export class PrismaEstadoGeneralDataProvider implements IEstadoGeneralDataProvider {
  constructor(private readonly prisma: PrismaService) {}

  async findUsuario(
    usuarioId: string,
    juntaId: string,
  ): Promise<{ id: string } | null> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
      select: { id: true },
    });
    return usuario;
  }

  async countPagoCartaVigente(
    usuarioId: string,
    juntaId: string,
  ): Promise<number> {
    return this.prisma.pago.count({
      where: {
        usuarioId,
        juntaId,
        tipo: TipoPago.CARTA,
        vigencia: true,
      },
    });
  }
}
