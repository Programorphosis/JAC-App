import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { DebtModule } from '../../infrastructure/debt/debt.module';
import { RequisitoModule } from '../../infrastructure/requisito/requisito.module';
import { EstadoGeneralController } from './estado-general.controller';
import { EstadoGeneralService } from './estado-general.service';

@Module({
  imports: [PrismaModule, DebtModule, RequisitoModule],
  controllers: [EstadoGeneralController],
  providers: [EstadoGeneralService],
  exports: [EstadoGeneralService],
})
export class EstadoGeneralModule {}
