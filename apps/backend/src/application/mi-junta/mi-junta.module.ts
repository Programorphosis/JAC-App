import { Module } from '@nestjs/common';
import { MiJuntaController } from './mi-junta.controller';
import { MiJuntaService } from './mi-junta.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';

@Module({
  imports: [PrismaModule, AuditModule],
  controllers: [MiJuntaController],
  providers: [MiJuntaService],
})
export class MiJuntaModule {}
