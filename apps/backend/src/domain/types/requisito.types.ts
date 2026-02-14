/**
 * Tipos de dominio para RequisitoService.
 * Referencia: definicionDomainServices.md, flujoRequisitosAdicionales.md
 */

export type EstadoRequisitoTipo = 'AL_DIA' | 'MORA';

export interface UpdateEstadoRequisitoParams {
  requisitoTipoId: string;
  usuarioId: string;
  juntaId: string;
  nuevoEstado: EstadoRequisitoTipo;
  cambiadoPorId: string;
}

export interface UpdateObligacionRequisitoParams {
  requisitoTipoId: string;
  usuarioId: string;
  juntaId: string;
  obligacionActiva: boolean;
  cambiadoPorId: string;
}

export interface ApplyMonthlyCutoffParams {
  /** Opcional: si no se pasa, procesa todas las juntas. */
  juntaId?: string;
  /** ID de usuario para auditoría (cron: usar usuario sistema/admin). */
  ejecutadoPorId: string;
}

export interface RequisitoParaCarta {
  requisitoTipoId: string;
  nombre: string;
  obligacionActiva: boolean;
  estado: EstadoRequisitoTipo;
}
