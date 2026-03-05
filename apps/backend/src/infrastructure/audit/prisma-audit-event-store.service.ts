import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type { IAuditEventStore } from '../../domain/ports/audit-event-store.port';
import type { RegisterAuditEventParams } from '../../domain/types/audit.types';

/** Cliente Prisma o transacción. */
type PrismaClientLike = Pick<PrismaService, 'auditoria'>;

/**
 * Implementación de IAuditEventStore usando Prisma.
 * Acepta PrismaService o cliente de transacción.
 */
@Injectable()
export class PrismaAuditEventStore implements IAuditEventStore {
  constructor(
    @Inject(PrismaService) private readonly prisma: PrismaClientLike,
  ) {}

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
