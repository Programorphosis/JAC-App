import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { JuntaService } from './junta.service';

@Module({
  imports: [PrismaModule, AuditModule],
  providers: [JuntaService],
  exports: [JuntaService],
})
export class JuntaModule {}
