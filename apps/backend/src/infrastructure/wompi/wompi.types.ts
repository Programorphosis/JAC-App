/**
 * Credenciales Wompi por junta (WOMPI_POR_JUNTA_DOC §5.1).
 * Se pasan por llamada; no se leen de env.
 */
export interface WompiCredenciales {
  privateKey: string;
  environment: 'sandbox' | 'production';
}
