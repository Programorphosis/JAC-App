/**
 * Puerto para generación de PDF de cartas.
 * Referencia: validacionesDeCartaQR.md
 */

export const PDF_GENERATOR = Symbol('PDF_GENERATOR');

export interface CartaPdfData {
  usuarioId: string;
  nombres: string;
  apellidos: string;
  numeroDocumento: string;
  consecutivo: number;
  anio: number;
  qrToken: string;
}

export interface IPdfGenerator {
  /**
   * Genera PDF de la carta. Retorna ruta/URL si se subió a almacenamiento.
   * Puede retornar null si no hay almacenamiento configurado (MVP).
   */
  generateCartaPdf(data: CartaPdfData): Promise<{ rutaPdf: string; hashDocumento?: string } | null>;
}
