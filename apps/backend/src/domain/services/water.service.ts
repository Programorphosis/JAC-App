/**
 * WaterService - Gestionar estado y obligación de agua.
 * Dominio puro: no depende de Nest, Prisma ni HTTP.
 * Referencia: definicionDomainServices.md, flujoReceptorDeAgua.md
 *
 * Único servicio autorizado para modificar EstadoAgua e HistorialAgua.
 */
import type { IWaterRepository } from '../ports/water-repository.port';
import type { IAuditEventStore } from '../ports/audit-event-store.port';
import type {
  UpdateWaterStatusParams,
  UpdateWaterObligationParams,
} from '../types/water.types';
import {
  UsuarioNoEncontradoError,
  EstadoAguaMismoEstadoError,
  EstadoAguaMismaObligacionError,
} from '../errors/domain.errors';

export class WaterService {
  constructor(
    private readonly waterRepo: IWaterRepository,
    private readonly auditStore: IAuditEventStore,
  ) {}

  async updateWaterStatus(params: UpdateWaterStatusParams): Promise<void> {
    const { usuarioId, juntaId, nuevoEstado, cambiadoPorId } = params;

    const actual = await this.waterRepo.getEstadoAgua(usuarioId, juntaId);
    if (!actual) {
      throw new UsuarioNoEncontradoError(usuarioId);
    }
    if (actual.estado === nuevoEstado) {
      throw new EstadoAguaMismoEstadoError(usuarioId, nuevoEstado);
    }

    await this.waterRepo.createHistorialAgua({
      usuarioId,
      tipoCambio: 'ESTADO',
      estadoAnterior: actual.estado,
      estadoNuevo: nuevoEstado,
      obligacionAnterior: null,
      obligacionNueva: null,
      cambiadoPorId,
      cambioAutomatico: false,
    });

    await this.waterRepo.updateEstadoAguaEstado(usuarioId, nuevoEstado);

    await this.auditStore.registerEvent({
      juntaId,
      entidad: 'EstadoAgua',
      entidadId: usuarioId,
      accion: 'CAMBIO_ESTADO_AGUA',
      metadata: { estadoAnterior: actual.estado, estadoNuevo: nuevoEstado },
      ejecutadoPorId: cambiadoPorId,
    });
  }

  async updateWaterObligation(params: UpdateWaterObligationParams): Promise<void> {
    const { usuarioId, juntaId, obligacionActiva, cambiadoPorId } = params;

    const actual = await this.waterRepo.getEstadoAgua(usuarioId, juntaId);
    if (!actual) {
      throw new UsuarioNoEncontradoError(usuarioId);
    }
    if (actual.obligacionActiva === obligacionActiva) {
      throw new EstadoAguaMismaObligacionError(usuarioId);
    }

    await this.waterRepo.createHistorialAgua({
      usuarioId,
      tipoCambio: 'OBLIGACION',
      obligacionAnterior: actual.obligacionActiva,
      obligacionNueva: obligacionActiva,
      cambiadoPorId,
      cambioAutomatico: false,
    });

    await this.waterRepo.updateEstadoAguaObligacion(usuarioId, obligacionActiva);

    await this.auditStore.registerEvent({
      juntaId,
      entidad: 'EstadoAgua',
      entidadId: usuarioId,
      accion: 'CAMBIO_OBLIGACION_AGUA',
      metadata: {
        obligacionAnterior: actual.obligacionActiva,
        obligacionNueva: obligacionActiva,
      },
      ejecutadoPorId: cambiadoPorId,
    });
  }

  async applyMonthlyWaterCutoff(params: {
    juntaId: string;
    /** ID de usuario para auditoría (cron: usar usuario sistema/admin). */
    ejecutadoPorId: string;
  }): Promise<void> {
    const { juntaId, ejecutadoPorId } = params;

    const usuarios = await this.waterRepo.getUsuariosParaCorteMensual(juntaId);

    for (const { usuarioId } of usuarios) {
      await this.waterRepo.createHistorialAgua({
        usuarioId,
        tipoCambio: 'ESTADO',
        estadoAnterior: 'AL_DIA',
        estadoNuevo: 'MORA',
        cambiadoPorId: undefined,
        cambioAutomatico: true,
      });

      await this.waterRepo.updateEstadoAguaEstado(usuarioId, 'MORA');

      await this.auditStore.registerEvent({
        juntaId,
        entidad: 'EstadoAgua',
        entidadId: usuarioId,
        accion: 'CORTE_MENSUAL_AGUA',
        metadata: { cambioAutomatico: true },
        ejecutadoPorId,
      });
    }
  }
}
