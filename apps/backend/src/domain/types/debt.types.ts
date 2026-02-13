/**
 * Tipos de dominio para DebtService.
 * Referencia: definicionDomainServices.md, calculadoraDeDeuda.md
 */

export type EstadoLaboralTipo = 'TRABAJANDO' | 'NO_TRABAJANDO';

export interface DebtMonthDetail {
  year: number;
  month: number;
  estadoLaboral: EstadoLaboralTipo;
  tarifaAplicada: number;
}

export interface DebtResult {
  total: number;
  detalle: DebtMonthDetail[];
}

export interface CalculateUserDebtParams {
  usuarioId: string;
  juntaId: string;
  fechaCorte?: Date;
}
