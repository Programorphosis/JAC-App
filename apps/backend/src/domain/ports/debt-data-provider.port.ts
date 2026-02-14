/**
 * Puerto de lectura para cálculo de deuda.
 * El dominio define el contrato; la infraestructura lo implementa (Prisma).
 * Referencia: calculadoraDeDeuda.md, definicionDomainServices.md
 */

import type { EstadoLaboralTipo } from '../types/debt.types';

export const DEBT_DATA_PROVIDER = Symbol('DEBT_DATA_PROVIDER');

export interface UsuarioParaCalculo {
  fechaCreacion: Date;
}

export interface UltimoPagoJunta {
  fechaPago: Date;
}

export interface IDebtDataProvider {
  /** Usuario debe existir y pertenecer a la junta. */
  getUsuarioParaCalculo(usuarioId: string, juntaId: string): Promise<UsuarioParaCalculo | null>;

  /** Último pago tipo JUNTA del usuario en la junta. */
  getUltimoPagoJunta(usuarioId: string, juntaId: string): Promise<UltimoPagoJunta | null>;

  /**
   * Estado laboral vigente en el mes. Debe existir exactamente un registro.
   * Lanza si no hay historial o hay superposición.
   */
  getEstadoLaboralEnMes(
    usuarioId: string,
    juntaId: string,
    year: number,
    month: number,
  ): Promise<EstadoLaboralTipo>;

  /**
   * Tarifa vigente para el estado y mes. Debe existir.
   * Lanza si no hay tarifa.
   */
  getTarifaVigente(
    juntaId: string,
    estadoLaboral: EstadoLaboralTipo,
    year: number,
    month: number,
  ): Promise<number>;
}
