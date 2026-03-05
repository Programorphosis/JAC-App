/**
 * RequisitoService - Gestionar requisitos adicionales dinámicos (agua, basura, etc.).
 * Dominio puro: no depende de Nest, Prisma ni HTTP.
 * Referencia: definicionDomainServices.md, flujoRequisitosAdicionales.md
 *
 * Único servicio autorizado para modificar EstadoRequisito e HistorialRequisito.
 */
import type { IRequisitoRepository } from '../ports/requisito-repository.port';
import type { IAuditEventStore } from '../ports/audit-event-store.port';
import type {
  UpdateEstadoRequisitoParams,
  UpdateObligacionRequisitoParams,
  ApplyMonthlyCutoffParams,
} from '../types/requisito.types';
import {
  EstadoRequisitoMismoEstadoError,
  EstadoRequisitoMismaObligacionError,
} from '../errors/domain.errors';

export class RequisitoService {
  constructor(
    private readonly requisitoRepo: IRequisitoRepository,
    private readonly auditStore: IAuditEventStore,
  ) {}

  async updateEstadoRequisito(
    params: UpdateEstadoRequisitoParams,
  ): Promise<void> {
    const { requisitoTipoId, usuarioId, juntaId, nuevoEstado, cambiadoPorId } =
      params;

    const actual = await this.requisitoRepo.getEstadoRequisito(
      usuarioId,
      requisitoTipoId,
      juntaId,
    );
    if (actual?.estado === nuevoEstado) {
      throw new EstadoRequisitoMismoEstadoError(
        usuarioId,
        requisitoTipoId,
        nuevoEstado,
      );
    }

    await this.requisitoRepo.createHistorialRequisito({
      usuarioId,
      requisitoTipoId,
      tipoCambio: 'ESTADO',
      estadoAnterior: actual?.estado ?? null,
      estadoNuevo: nuevoEstado,
      obligacionAnterior: null,
      obligacionNueva: null,
      cambiadoPorId,
      cambioAutomatico: false,
    });

    await this.requisitoRepo.updateEstadoRequisitoEstado(
      usuarioId,
      requisitoTipoId,
      nuevoEstado,
    );

    await this.auditStore.registerEvent({
      juntaId,
      entidad: 'EstadoRequisito',
      entidadId: `${usuarioId}:${requisitoTipoId}`,
      accion: 'CAMBIO_ESTADO_REQUISITO',
      metadata: {
        requisitoTipoId,
        estadoAnterior: actual?.estado,
        estadoNuevo: nuevoEstado,
      },
      ejecutadoPorId: cambiadoPorId,
    });
  }

  async updateObligacionRequisito(
    params: UpdateObligacionRequisitoParams,
  ): Promise<void> {
    const {
      requisitoTipoId,
      usuarioId,
      juntaId,
      obligacionActiva,
      cambiadoPorId,
    } = params;

    const actual = await this.requisitoRepo.getEstadoRequisito(
      usuarioId,
      requisitoTipoId,
      juntaId,
    );
    if (actual?.obligacionActiva === obligacionActiva) {
      throw new EstadoRequisitoMismaObligacionError(usuarioId, requisitoTipoId);
    }

    await this.requisitoRepo.createHistorialRequisito({
      usuarioId,
      requisitoTipoId,
      tipoCambio: 'OBLIGACION',
      obligacionAnterior: actual?.obligacionActiva,
      obligacionNueva: obligacionActiva,
      cambiadoPorId,
      cambioAutomatico: false,
    });

    await this.requisitoRepo.updateEstadoRequisitoObligacion(
      usuarioId,
      requisitoTipoId,
      obligacionActiva,
    );

    await this.auditStore.registerEvent({
      juntaId,
      entidad: 'EstadoRequisito',
      entidadId: `${usuarioId}:${requisitoTipoId}`,
      accion: 'CAMBIO_OBLIGACION_REQUISITO',
      metadata: {
        requisitoTipoId,
        obligacionAnterior: actual?.obligacionActiva,
        obligacionNueva: obligacionActiva,
      },
      ejecutadoPorId: cambiadoPorId,
    });
  }

  async applyMonthlyCutoff(params: ApplyMonthlyCutoffParams): Promise<void> {
    const { juntaId, ejecutadoPorId } = params;

    const requisitosYUsuarios =
      await this.requisitoRepo.getRequisitosYUsuariosParaCorte(juntaId);

    for (const {
      requisitoTipoId,
      juntaId: jId,
      usuarios,
    } of requisitosYUsuarios) {
      for (const { usuarioId } of usuarios) {
        await this.requisitoRepo.createHistorialRequisito({
          usuarioId,
          requisitoTipoId,
          tipoCambio: 'ESTADO',
          estadoAnterior: 'AL_DIA',
          estadoNuevo: 'MORA',
          cambiadoPorId: undefined,
          cambioAutomatico: true,
        });

        await this.requisitoRepo.updateEstadoRequisitoEstado(
          usuarioId,
          requisitoTipoId,
          'MORA',
        );

        await this.auditStore.registerEvent({
          juntaId: jId,
          entidad: 'EstadoRequisito',
          entidadId: `${usuarioId}:${requisitoTipoId}`,
          accion: 'CORTE_MENSUAL_REQUISITO',
          metadata: { requisitoTipoId, cambioAutomatico: true },
          ejecutadoPorId,
        });
      }
    }
  }
}
