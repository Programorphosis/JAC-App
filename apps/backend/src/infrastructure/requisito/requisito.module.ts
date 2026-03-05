import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { RequisitoService } from '../../domain/services/requisito.service';
import { PrismaRequisitoRepository } from './prisma-requisito-repository.service';
import { RequisitoOperationRunner } from './requisito-operation-runner.service';
import { REQUISITO_REPOSITORY } from '../../domain/ports/requisito-repository.port';
import { PrismaAuditEventStore } from '../audit/prisma-audit-event-store.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [
    {
      provide: REQUISITO_REPOSITORY,
      useClass: PrismaRequisitoRepository,
    },
    {
      provide: RequisitoService,
      useFactory: (
        repo: PrismaRequisitoRepository,
        audit: PrismaAuditEventStore,
      ) => new RequisitoService(repo, audit),
      inject: [REQUISITO_REPOSITORY, PrismaAuditEventStore],
    },
    RequisitoOperationRunner,
  ],
  exports: [RequisitoService, RequisitoOperationRunner, REQUISITO_REPOSITORY],
})
export class RequisitoModule {}
