import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditoriasController } from './auditorias.controller';
import { AuditoriasService } from './auditorias.service';

@Module({
  imports: [PrismaModule],
  controllers: [AuditoriasController],
  providers: [AuditoriasService],
})
export class AuditoriasModule {}
