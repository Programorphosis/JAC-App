/**
 * Tipos de dominio para PaymentService.
 * Referencia: definicionDomainServices.md, flujoDePagos.md
 */

export type MetodoPago = 'EFECTIVO' | 'TRANSFERENCIA' | 'ONLINE';

export interface RegisterJuntaPaymentParams {
  usuarioId: string;
  juntaId: string;
  metodo: MetodoPago;
  registradoPorId: string;
  referenciaExterna?: string;
}

export interface RegisterJuntaPaymentResult {
  pagoId: string;
  monto: number;
  consecutivo: number;
}
