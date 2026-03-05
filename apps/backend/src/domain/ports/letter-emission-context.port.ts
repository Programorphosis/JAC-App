/**
 * Contexto de transacción para emisión de carta.
 * Permite ejecutar toda la operación dentro de una transacción.
 * Referencia: flujoSolicitudCarta.md, validacionesDeCartaQR.md
 */

import type { DebtResult } from '../types/debt.types';
import type { RegisterAuditEventParams } from '../types/audit.types';
import type { RequisitoParaCarta } from '../types/requisito.types';

export interface CartaParaEmitir {
  id: string;
  usuarioId: string;
  juntaId: string;
  estado: string;
  usuarioNombres?: string;
  usuarioApellidos?: string;
  usuarioDocumento?: string;
  /** Fecha de afiliación (libro físico). Para PDF. */
  fechaAfiliacion?: Date | null;
  /** Folio del libro. Para PDF. */
  folio?: number | null;
  /** Numeral consecutivo del libro. Para PDF. */
  numeral?: number | null;
  /** Teléfono del usuario. Para PDF. */
  usuarioTelefono?: string | null;
  /** Lugar de expedición del documento. Para PDF. */
  usuarioLugarExpedicion?: string | null;
}

export interface ILetterEmissionContext {
  calculateDebt(usuarioId: string, juntaId: string): Promise<DebtResult>;
  getCarta(cartaId: string, juntaId: string): Promise<CartaParaEmitir | null>;
  hasPagoCarta(usuarioId: string, juntaId: string): Promise<boolean>;
  getRequisitosParaCarta(
    usuarioId: string,
    juntaId: string,
  ): Promise<RequisitoParaCarta[]>;
  getNextConsecutivoCarta(juntaId: string): Promise<number>;
  updateCartaAprobada(data: {
    cartaId: string;
    juntaId: string;
    consecutivo: number;
    anio: number;
    qrToken: string;
    fechaEmision: Date;
    emitidaPorId: string;
    rutaPdf?: string | null;
    hashDocumento?: string | null;
  }): Promise<void>;
  /** Consumir pago tipo CARTA (vigencia → false) al aprobar la carta. */
  consumePagoCarta(usuarioId: string, juntaId: string): Promise<void>;
  registerAudit(params: RegisterAuditEventParams): Promise<void>;
  generateCartaPdf?(data: {
    juntaId: string;
    usuarioId: string;
    qrToken: string;
    consecutivo: number;
    anio: number;
    usuarioNombres: string;
    usuarioApellidos: string;
    usuarioDocumento: string;
    usuarioTelefono?: string | null;
    usuarioLugarExpedicion?: string | null;
    fechaAfiliacion?: Date | null;
    folio?: number | null;
    numeral?: number | null;
    juntaNombre?: string;
    juntaNit?: string | null;
    juntaDepartamento?: string | null;
    juntaCiudad?: string | null;
    juntaPersoneriaJuridica?: string | null;
  }): Promise<{ rutaPdf: string; hashDocumento?: string } | null>;
}
