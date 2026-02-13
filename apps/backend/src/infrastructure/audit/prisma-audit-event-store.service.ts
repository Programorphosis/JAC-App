import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IAuditEventStore } from '../../domain/ports/audit-event-store.port';
import type { RegisterAuditEventParams } from '../../domain/types/audit.types';

/**
 * Implementación de IAuditEventStore usando Prisma.
 * Capa de infraestructura: conoce el framework y la persistencia.
 */
@Injectable()
export class PrismaAuditEventStore implements IAuditEventStore {
  constructor(private readonly prisma: PrismaService) {}

  async registerEvent(params: RegisterAuditEventParams): Promise<void> {
    await this.prisma.auditoria.create({
      data: {
        juntaId: params.juntaId,
        entidad: params.entidad,
        entidadId: params.entidadId,
        accion: params.accion,
        metadata: params.metadata as object,
        ejecutadoPorId: params.ejecutadoPorId,
      },
    });
  }
}
