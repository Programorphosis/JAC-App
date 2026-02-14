/**
 * EstadoGeneralService - Calcula estado para solicitud de carta.
 * Referencia: flujoSolicitudCarta.md
 *
 * No almacena estado; todo se calcula bajo demanda.
 */
import { Injectable, Inject } from '@nestjs/common';
import { DebtService } from '../../domain/services/debt.service';
import { PrismaService } from '../../prisma/prisma.service';
import { TipoPago } from '@prisma/client';
import type { IRequisitoRepository } from '../../domain/ports/requisito-repository.port';
import { REQUISITO_REPOSITORY } from '../../domain/ports/requisito-repository.port';
import {
  UsuarioNoEncontradoError,
  SinHistorialLaboralError,
  SinTarifaVigenteError,
  HistorialLaboralSuperpuestoError,
} from '../../domain/errors/domain.errors';

export interface EstadoGeneralResult {
  deuda_junta: number;
  requisitos: Array<{ nombre: string; obligacionActiva: boolean; estado: string }>;
  pago_carta: boolean;
}

@Injectable()
export class EstadoGeneralService {
  constructor(
    private readonly debtService: DebtService,
    @Inject(REQUISITO_REPOSITORY) private readonly requisitoRepo: IRequisitoRepository,
    private readonly prisma: PrismaService,
  ) {}

  async getEstadoGeneral(usuarioId: string, juntaId: string): Promise<EstadoGeneralResult> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
    });
    if (!usuario) {
      throw new UsuarioNoEncontradoError(usuarioId);
    }

    let deuda_junta = 0;
    try {
      const debtResult = await this.debtService.calculateUserDebt({
        usuarioId,
        juntaId,
      });
      deuda_junta = debtResult.total;
    } catch (err) {
      if (
        err instanceof SinHistorialLaboralError ||
        err instanceof SinTarifaVigenteError ||
        err instanceof HistorialLaboralSuperpuestoError
      ) {
        deuda_junta = 0;
      } else {
        throw err;
      }
    }

    const requisitos = await this.requisitoRepo.getRequisitosParaCarta(usuarioId, juntaId);

    const pagoCartaCount = await this.prisma.pago.count({
      where: {
        usuarioId,
        juntaId,
        tipo: TipoPago.CARTA,
      },
    });
    const pago_carta = pagoCartaCount > 0;

    return {
      deuda_junta,
      requisitos: requisitos.map((r) => ({
        requisitoTipoId: r.requisitoTipoId,
        nombre: r.nombre,
        obligacionActiva: r.obligacionActiva,
        estado: r.estado,
      })),
      pago_carta,
    };
  }
}
