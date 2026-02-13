/**
 * AuditService - Registrar eventos críticos del sistema.
 * Dominio puro: no depende de Nest, Prisma ni HTTP.
 * Referencia: definicionDomainServices.md
 *
 * Usa el puerto IAuditEventStore para persistencia (inyección en capa de aplicación).
 */
import type { RegisterAuditEventParams } from '../types/audit.types';
import type { IAuditEventStore } from '../ports/audit-event-store.port';

export class AuditService {
  constructor(private readonly eventStore: IAuditEventStore) {}

  async registerEvent(params: RegisterAuditEventParams): Promise<void> {
    await this.eventStore.registerEvent(params);
  }
}
