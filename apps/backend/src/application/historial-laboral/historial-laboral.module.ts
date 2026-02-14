import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { HistorialLaboralController } from './historial-laboral.controller';
import { HistorialLaboralService } from './historial-laboral.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [HistorialLaboralController],
  providers: [HistorialLaboralService],
  exports: [HistorialLaboralService],
})
export class HistorialLaboralModule {}
