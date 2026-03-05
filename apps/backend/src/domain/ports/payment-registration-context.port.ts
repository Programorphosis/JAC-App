/**
 * Contexto de transacción para registro de pago JUNTA.
 * Permite ejecutar toda la operación dentro de una transacción serializable.
 * Referencia: flujoDePagosCondicionDeCarrera.md
 */

import type { DebtResult } from '../types/debt.types';
import type { RegisterAuditEventParams } from '../types/audit.types';

export interface CreateJuntaPaymentData {
  usuarioId: string;
  juntaId: string;
  monto: number;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'ONLINE';
  registradoPorId: string;
  referenciaExterna?: string;
  consecutivo: number;
}

export interface IPaymentRegistrationContext {
  calculateDebt(usuarioId: string, juntaId: string): Promise<DebtResult>;
  createJuntaPayment(data: CreateJuntaPaymentData): Promise<{ pagoId: string }>;
  registerAudit(params: RegisterAuditEventParams): Promise<void>;
  findPagoByReferenciaExterna(
    referenciaExterna: string,
  ): Promise<{ id: string } | null>;
  getNextConsecutivoPagoJunta(juntaId: string): Promise<number>;
}
