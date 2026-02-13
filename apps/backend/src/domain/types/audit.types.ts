/**
 * Tipos de dominio para AuditService.
 * Referencia: definicionDomainServices.md
 */

export interface RegisterAuditEventParams {
  juntaId: string;
  entidad: string;
  entidadId: string;
  accion: string;
  metadata: Record<string, unknown>;
  ejecutadoPorId: string;
}
