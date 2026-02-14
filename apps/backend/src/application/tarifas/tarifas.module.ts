import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { TarifasController } from './tarifas.controller';
import { TarifasService } from './tarifas.service';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [TarifasController],
  providers: [TarifasService],
  exports: [TarifasService],
})
export class TarifasModule {}
