import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { WaterService } from '../../domain/services/water.service';
import { PrismaWaterRepository } from './prisma-water-repository.service';
import { PrismaAuditEventStore } from '../audit/prisma-audit-event-store.service';
import type {
  UpdateWaterStatusParams,
  UpdateWaterObligationParams,
  ApplyMonthlyWaterCutoffParams,
} from '../../domain/types/water.types';

/**
 * Ejecuta operaciones de WaterService dentro de transacción.
 * Referencia: flujoReceptorDeAgua.md – "Transacción" obligatoria.
 */
@Injectable()
export class WaterOperationRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly waterService: WaterService,
  ) {}

  async updateWaterStatus(params: UpdateWaterStatusParams): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const repo = new PrismaWaterRepository(tx);
      const audit = new PrismaAuditEventStore(tx);
      const service = new WaterService(repo, audit);
      await service.updateWaterStatus(params);
    });
  }

  async updateWaterObligation(params: UpdateWaterObligationParams): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const repo = new PrismaWaterRepository(tx);
      const audit = new PrismaAuditEventStore(tx);
      const service = new WaterService(repo, audit);
      await service.updateWaterObligation(params);
    });
  }

  async applyMonthlyWaterCutoff(params: ApplyMonthlyWaterCutoffParams): Promise<void> {
    return this.prisma.$transaction(async (tx) => {
      const repo = new PrismaWaterRepository(tx);
      const audit = new PrismaAuditEventStore(tx);
      const service = new WaterService(repo, audit);
      await service.applyMonthlyWaterCutoff(params);
    });
  }
}
