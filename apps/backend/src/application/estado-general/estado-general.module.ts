import { Module } from '@nestjs/common';
import { AuthModule } from '../../auth/auth.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { DebtModule } from '../../infrastructure/debt/debt.module';
import { RequisitoModule } from '../../infrastructure/requisito/requisito.module';
import { PrismaEstadoGeneralDataProvider } from '../../infrastructure/estado-general/prisma-estado-general-data-provider.service';
import { ESTADO_GENERAL_DATA_PROVIDER } from '../../domain/ports/estado-general-data-provider.port';
import { EstadoGeneralController } from './estado-general.controller';
import { EstadoGeneralService } from './estado-general.service';

@Module({
  imports: [AuthModule, PrismaModule, DebtModule, RequisitoModule],
  controllers: [EstadoGeneralController],
  providers: [
    {
      provide: ESTADO_GENERAL_DATA_PROVIDER,
      useClass: PrismaEstadoGeneralDataProvider,
    },
    EstadoGeneralService,
  ],
  exports: [EstadoGeneralService],
})
export class EstadoGeneralModule {}
