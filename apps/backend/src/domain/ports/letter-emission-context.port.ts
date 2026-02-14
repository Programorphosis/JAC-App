/**
 * Contexto de transacción para emisión de carta.
 * Permite ejecutar toda la operación dentro de una transacción.
 * Referencia: flujoSolicitudCarta.md, validacionesDeCartaQR.md
 */

import type { DebtResult } from '../types/debt.types';
import type { RegisterAuditEventParams } from '../types/audit.types';

export interface CartaParaEmitir {
  id: string;
  usuarioId: string;
  juntaId: string;
  estado: string;
  usuarioNombres?: string;
  usuarioApellidos?: string;
  usuarioDocumento?: string;
}

export interface EstadoAguaParaCarta {
  obligacionActiva: boolean;
  estado: 'AL_DIA' | 'MORA';
}

export interface ILetterEmissionContext {
  calculateDebt(usuarioId: string, juntaId: string): Promise<DebtResult>;
  getCarta(cartaId: string, juntaId: string): Promise<CartaParaEmitir | null>;
  hasPagoCarta(usuarioId: string, juntaId: string): Promise<boolean>;
  getEstadoAgua(usuarioId: string, juntaId: string): Promise<EstadoAguaParaCarta | null>;
  getNextConsecutivoCarta(juntaId: string): Promise<number>;
  updateCartaAprobada(data: {
    cartaId: string;
    consecutivo: number;
    anio: number;
    qrToken: string;
    fechaEmision: Date;
    emitidaPorId: string;
    rutaPdf?: string | null;
    hashDocumento?: string | null;
  }): Promise<void>;
  registerAudit(params: RegisterAuditEventParams): Promise<void>;
  generateCartaPdf?(data: {
    qrToken: string;
    consecutivo: number;
    anio: number;
    usuarioNombres: string;
    usuarioApellidos: string;
    usuarioDocumento: string;
  }): Promise<{ rutaPdf: string; hashDocumento?: string } | null>;
}
