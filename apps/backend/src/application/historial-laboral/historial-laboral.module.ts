import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { HistorialLaboralController } from './historial-laboral.controller';
import { HistorialLaboralService } from './historial-laboral.service';

@Module({
  imports: [AuthModule, PrismaModule, AuditModule],
  controllers: [HistorialLaboralController],
  providers: [HistorialLaboralService],
  exports: [HistorialLaboralService],
})
export class HistorialLaboralModule {}
