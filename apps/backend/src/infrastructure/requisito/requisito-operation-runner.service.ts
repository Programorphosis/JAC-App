import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { RequisitoService } from '../../domain/services/requisito.service';
import { PrismaRequisitoRepository } from './prisma-requisito-repository.service';
import { PrismaAuditEventStore } from '../audit/prisma-audit-event-store.service';
import type {
  UpdateEstadoRequisitoParams,
  UpdateObligacionRequisitoParams,
  ApplyMonthlyCutoffParams,
} from '../../domain/types/requisito.types';

/**
 * Ejecuta operaciones de RequisitoService dentro de transacción.
 * Referencia: flujoRequisitosAdicionales.md – transacción obligatoria.
 */
@Injectable()
export class RequisitoOperationRunner {
  constructor(private readonly prisma: PrismaService) {}

  async updateEstadoRequisito(
    params: UpdateEstadoRequisitoParams,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const repo = new PrismaRequisitoRepository(tx);
      const audit = new PrismaAuditEventStore(tx);
      const service = new RequisitoService(repo, audit);
      await service.updateEstadoRequisito(params);
    });
  }

  async updateObligacionRequisito(
    params: UpdateObligacionRequisitoParams,
  ): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const repo = new PrismaRequisitoRepository(tx);
      const audit = new PrismaAuditEventStore(tx);
      const service = new RequisitoService(repo, audit);
      await service.updateObligacionRequisito(params);
    });
  }

  async applyMonthlyCutoff(params: ApplyMonthlyCutoffParams): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const repo = new PrismaRequisitoRepository(tx);
      const audit = new PrismaAuditEventStore(tx);
      const service = new RequisitoService(repo, audit);
      await service.applyMonthlyCutoff(params);
    });
  }
}
