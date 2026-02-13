import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaAuditEventStore } from './prisma-audit-event-store.service';
import { AuditService } from '../../domain/services/audit.service';
import { AUDIT_EVENT_STORE } from '../../domain/ports/audit-event-store.port';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaAuditEventStore,
    {
      provide: AUDIT_EVENT_STORE,
      useExisting: PrismaAuditEventStore,
    },
    {
      provide: AuditService,
      useFactory: (store: PrismaAuditEventStore) => new AuditService(store),
      inject: [PrismaAuditEventStore],
    },
  ],
  exports: [AuditService],
})
export class AuditModule {}
