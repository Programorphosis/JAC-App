/**
 * Tipos de dominio para WaterService.
 * Referencia: definicionDomainServices.md, flujoReceptorDeAgua.md
 */

export type EstadoAguaTipo = 'AL_DIA' | 'MORA';

export interface UpdateWaterStatusParams {
  usuarioId: string;
  juntaId: string;
  nuevoEstado: EstadoAguaTipo;
  cambiadoPorId: string;
}

export interface UpdateWaterObligationParams {
  usuarioId: string;
  juntaId: string;
  obligacionActiva: boolean;
  cambiadoPorId: string;
}

export interface ApplyMonthlyWaterCutoffParams {
  juntaId: string;
  /** ID de usuario para auditoría (cron: usar usuario sistema/admin). */
  ejecutadoPorId: string;
}
