/**
 * EstadoGeneralService - Caso de uso de consulta enriquecida para UI.
 * Referencia: flujoSolicitudCarta.md, definicionDomainServices.md
 *
 * Calcula estado para solicitud de carta. No almacena estado; todo se calcula bajo demanda.
 *
 * NOTA DE DISEÑO: Este servicio mezcla datos de dominio con lógica de permisos (puedeModificarEstado,
 * puedeModificarObligacion) calculados a partir del actor. Es una decisión explícita: "estado enriquecido
 * para UI" es responsabilidad de Application. La autorización por requisito vive aquí para simplificar
 * el contrato del endpoint. Si cambian las reglas de permisos, modificar este servicio.
 */
import { Injectable, Inject } from '@nestjs/common';
import { DebtService } from '../../domain/services/debt.service';
import { RolNombre } from '@prisma/client';
import type { IRequisitoRepository } from '../../domain/ports/requisito-repository.port';
import { REQUISITO_REPOSITORY } from '../../domain/ports/requisito-repository.port';
import type { IEstadoGeneralDataProvider } from '../../domain/ports/estado-general-data-provider.port';
import { ESTADO_GENERAL_DATA_PROVIDER } from '../../domain/ports/estado-general-data-provider.port';
import { UsuarioNoEncontradoError } from '../../domain/errors/domain.errors';

export interface EstadoGeneralResult {
  deuda_junta: number;
  requisitos: Array<{
    requisitoTipoId: string;
    nombre: string;
    obligacionActiva: boolean;
    estado: string;
    puedeModificarEstado: boolean;
    puedeModificarObligacion: boolean;
  }>;
  pago_carta: boolean;
}

@Injectable()
export class EstadoGeneralService {
  constructor(
    private readonly debtService: DebtService,
    @Inject(REQUISITO_REPOSITORY) private readonly requisitoRepo: IRequisitoRepository,
    @Inject(ESTADO_GENERAL_DATA_PROVIDER) private readonly dataProvider: IEstadoGeneralDataProvider,
  ) {}

  async getEstadoGeneral(
    usuarioId: string,
    juntaId: string,
    actor?: { id: string; roles: string[] },
  ): Promise<EstadoGeneralResult> {
    const usuario = await this.dataProvider.findUsuario(usuarioId, juntaId);
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
    } catch {
      // Datos inconsistentes (sin historial, sin tarifa vigente, superposición): deuda = 0.
      // No fallar el endpoint: la UI de requisitos solo necesita la lista de requisitos.
      deuda_junta = 0;
    }

    const requisitos = await this.requisitoRepo.getRequisitosParaCarta(usuarioId, juntaId);

    const pagoCartaCount = await this.dataProvider.countPagoCartaVigente(usuarioId, juntaId);
    const pago_carta = pagoCartaCount > 0;

    const esAdmin = actor?.roles?.includes(RolNombre.ADMIN) ?? false;

    return {
      deuda_junta,
      requisitos: requisitos.map((r) => ({
        requisitoTipoId: r.requisitoTipoId,
        nombre: r.nombre,
        obligacionActiva: r.obligacionActiva,
        estado: r.estado,
        puedeModificarEstado: actor != null && r.modificadorId === actor.id,
        puedeModificarObligacion: esAdmin,
      })),
      pago_carta,
    };
  }
}
