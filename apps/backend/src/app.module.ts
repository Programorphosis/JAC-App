import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { BootstrapModule } from './application/bootstrap/bootstrap.module';
import { PlatformModule } from './platform/platform.module';
import { DebtModule } from './infrastructure/debt/debt.module';
import { PaymentModule } from './infrastructure/payment/payment.module';
import { WaterModule } from './infrastructure/water/water.module';
import { LetterModule } from './infrastructure/letter/letter.module';
import { UsersModule } from './application/users/users.module';
import { HistorialLaboralModule } from './application/historial-laboral/historial-laboral.module';
import { TarifasModule } from './application/tarifas/tarifas.module';
import { DeudaModule } from './application/deuda/deuda.module';
import { PagosModule } from './application/pagos/pagos.module';
import { WebhooksModule } from './application/webhooks/webhooks.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    BootstrapModule,
    PlatformModule,
    DebtModule,
    PaymentModule,
    WaterModule,
    LetterModule,
    UsersModule,
    HistorialLaboralModule,
    TarifasModule,
    DeudaModule,
    PagosModule,
    WebhooksModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
