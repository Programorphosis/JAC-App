import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IDebtDataProvider } from '../../domain/ports/debt-data-provider.port';
import type { EstadoLaboralTipo } from '../../domain/types/debt.types';
import { TipoPago } from '@prisma/client';
import {
  SinHistorialLaboralError,
  SinTarifaVigenteError,
  HistorialLaboralSuperpuestoError,
} from '../../domain/errors/domain.errors';

/** Cliente Prisma o transacción - misma interfaz para modelos. */
type PrismaClientLike = Pick<
  PrismaService,
  'usuario' | 'pago' | 'historialLaboral' | 'tarifa'
>;

/**
 * Implementación de IDebtDataProvider usando Prisma.
 * Acepta PrismaService o cliente de transacción para uso dentro de $transaction.
 * Referencia: calculadoraDeDeuda.md
 */
@Injectable()
export class PrismaDebtDataProvider implements IDebtDataProvider {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaClientLike) {}

  async getUsuarioParaCalculo(usuarioId: string, juntaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
      select: { fechaCreacion: true },
    });
    return usuario;
  }

  async getUltimoPagoJunta(usuarioId: string, juntaId: string) {
    const pago = await this.prisma.pago.findFirst({
      where: { usuarioId, juntaId, tipo: TipoPago.JUNTA },
      orderBy: { fechaPago: 'desc' },
      select: { fechaPago: true },
    });
    return pago;
  }

  async getEstadoLaboralEnMes(
    usuarioId: string,
    juntaId: string,
    year: number,
    month: number,
  ): Promise<EstadoLaboralTipo> {
    const primerDia = new Date(year, month - 1, 1);
    const ultimoDia = new Date(year, month, 0);

    const registros = await this.prisma.historialLaboral.findMany({
      where: {
        usuarioId,
        usuario: { juntaId },
        fechaInicio: { lte: ultimoDia },
        OR: [{ fechaFin: null }, { fechaFin: { gte: primerDia } }],
      },
      select: { estado: true },
    });

    if (registros.length === 0) {
      throw new SinHistorialLaboralError(usuarioId);
    }
    if (registros.length > 1) {
      throw new HistorialLaboralSuperpuestoError(usuarioId);
    }

    return registros[0].estado as EstadoLaboralTipo;
  }

  async getTarifaVigente(
    juntaId: string,
    estadoLaboral: EstadoLaboralTipo,
    year: number,
    month: number,
  ): Promise<number> {
    const ultimoDia = new Date(year, month, 0);

    const tarifa = await this.prisma.tarifa.findFirst({
      where: {
        juntaId,
        estadoLaboral: estadoLaboral as 'TRABAJANDO' | 'NO_TRABAJANDO',
        fechaVigencia: { lte: ultimoDia },
      },
      orderBy: { fechaVigencia: 'desc' },
      select: { valorMensual: true },
    });

    if (!tarifa) {
      throw new SinTarifaVigenteError(juntaId, year, month);
    }

    return tarifa.valorMensual;
  }
}
