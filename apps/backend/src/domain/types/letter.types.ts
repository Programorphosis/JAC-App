/**
 * Tipos de dominio para LetterService.
 * Referencia: definicionDomainServices.md, flujoSolicitudCarta.md, validacionesDeCartaQR.md
 */

export interface EmitLetterParams {
  cartaId: string;
  juntaId: string;
  emitidaPorId: string;
}

export interface EmitLetterResult {
  cartaId: string;
  consecutivo: number;
  anio: number;
  qrToken: string;
  rutaPdf: string | null;
}
