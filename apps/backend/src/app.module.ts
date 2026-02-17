import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ScheduleModule } from '@nestjs/schedule';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { BootstrapModule } from './application/bootstrap/bootstrap.module';
import { PlatformModule } from './platform/platform.module';
import { DebtModule } from './infrastructure/debt/debt.module';
import { PaymentModule } from './infrastructure/payment/payment.module';
import { RequisitoModule } from './infrastructure/requisito/requisito.module';
import { LetterModule } from './infrastructure/letter/letter.module';
import { UsersModule } from './application/users/users.module';
import { HistorialLaboralModule } from './application/historial-laboral/historial-laboral.module';
import { TarifasModule } from './application/tarifas/tarifas.module';
import { DeudaModule } from './application/deuda/deuda.module';
import { PagosModule } from './application/pagos/pagos.module';
import { WebhooksModule } from './application/webhooks/webhooks.module';
import { RequisitosModule } from './application/requisitos/requisitos.module';
import { EstadoGeneralModule } from './application/estado-general/estado-general.module';
import { DocumentosModule } from './application/documentos/documentos.module';
import { CartasModule } from './application/cartas/cartas.module';
import { PublicModule } from './application/public/public.module';
import { AuditoriasModule } from './application/auditorias/auditorias.module';
import { MiJuntaModule } from './application/mi-junta/mi-junta.module';
import { WompiReconciliationModule } from './application/wompi-reconciliation/wompi-reconciliation.module';
import { DomainExceptionFilter } from './common/filters/domain-exception.filter';
import { EncryptionModule } from './infrastructure/encryption/encryption.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    ThrottlerModule.forRoot([
      {
        ttl: 60_000, // 1 minuto
        limit: 60, // 60 requests por minuto global
      },
    ]),
    PrismaModule,
    EncryptionModule,
    HealthModule,
    AuthModule,
    BootstrapModule,
    PlatformModule,
    DebtModule,
    PaymentModule,
    RequisitoModule,
    LetterModule,
    UsersModule,
    HistorialLaboralModule,
    TarifasModule,
    DeudaModule,
    PagosModule,
    WebhooksModule,
    RequisitosModule,
    EstadoGeneralModule,
    DocumentosModule,
    CartasModule,
    PublicModule,
    AuditoriasModule,
    MiJuntaModule,
    WompiReconciliationModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    {
      provide: APP_FILTER,
      useClass: DomainExceptionFilter,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
