import { Module } from '@nestjs/common';
import { WompiReconciliationService } from './wompi-reconciliation.service';
import { WompiReconciliationCronService } from './wompi-reconciliation-cron.service';
import { WompiReconciliationController } from './wompi-reconciliation.controller';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';
import { PagosModule } from '../pagos/pagos.module';
import { PlatformModule } from '../../platform/platform.module';
import { WompiModule } from '../../infrastructure/wompi/wompi.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { EncryptionModule } from '../../infrastructure/encryption/encryption.module';
import { AuthModule } from '../../auth/auth.module';

/**
 * Módulo de reconciliación Wompi.
 * Job nocturno que compara transacciones APPROVED en Wompi vs pagos en BD.
 * Referencia: flujoDePagosCasoFallaWebhook.md, consecutivosYCronJobs.md
 */
@Module({
  imports: [
    PagosModule,
    PlatformModule,
    WompiModule,
    PrismaModule,
    EncryptionModule,
    AuthModule,
  ],
  controllers: [WompiReconciliationController],
  providers: [
    WompiReconciliationService,
    WompiReconciliationCronService,
    PlatformAdminGuard,
  ],
})
export class WompiReconciliationModule {}
