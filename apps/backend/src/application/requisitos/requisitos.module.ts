import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../../infrastructure/audit/audit.module';
import { RequisitoModule } from '../../infrastructure/requisito/requisito.module';
import { RequisitosService } from './requisitos.service';
import { RequisitosController } from './requisitos.controller';
import { RequisitosUsuarioController } from './requisitos-usuario.controller';
import { RequisitosCronService } from './requisitos-cron.service';

@Module({
  imports: [PrismaModule, AuditModule, RequisitoModule],
  controllers: [RequisitosController, RequisitosUsuarioController],
  providers: [RequisitosService, RequisitosCronService],
  exports: [RequisitosService],
})
export class RequisitosModule {}
