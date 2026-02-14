import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { PrismaWaterRepository } from './prisma-water-repository.service';
import { WaterService } from '../../domain/services/water.service';
import { WaterOperationRunner } from './water-operation-runner.service';
import { WATER_REPOSITORY } from '../../domain/ports/water-repository.port';
import { AUDIT_EVENT_STORE } from '../../domain/ports/audit-event-store.port';
import type { IAuditEventStore } from '../../domain/ports/audit-event-store.port';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [
    PrismaWaterRepository,
    {
      provide: WATER_REPOSITORY,
      useExisting: PrismaWaterRepository,
    },
    {
      provide: WaterService,
      useFactory: (repo: PrismaWaterRepository, audit: IAuditEventStore) =>
        new WaterService(repo, audit),
      inject: [PrismaWaterRepository, AUDIT_EVENT_STORE],
    },
    WaterOperationRunner,
  ],
  exports: [WaterService, WaterOperationRunner],
})
export class WaterModule {}
