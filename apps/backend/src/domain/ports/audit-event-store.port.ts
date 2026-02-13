/**
 * Puerto de persistencia para eventos de auditoría.
 * El dominio define el contrato; la infraestructura lo implementa (Prisma, etc.).
 * Referencia: definicionDomainServices.md
 */

import type { RegisterAuditEventParams } from '../types/audit.types';

export const AUDIT_EVENT_STORE = Symbol('AUDIT_EVENT_STORE');

export interface IAuditEventStore {
  registerEvent(params: RegisterAuditEventParams): Promise<void>;
}
