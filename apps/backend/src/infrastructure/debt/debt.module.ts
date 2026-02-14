import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PrismaDebtDataProvider } from './prisma-debt-data-provider.service';
import { DebtService } from '../../domain/services/debt.service';
import { DEBT_DATA_PROVIDER } from '../../domain/ports/debt-data-provider.port';

@Module({
  imports: [PrismaModule],
  providers: [
    PrismaDebtDataProvider,
    {
      provide: DEBT_DATA_PROVIDER,
      useExisting: PrismaDebtDataProvider,
    },
    {
      provide: DebtService,
      useFactory: (provider: PrismaDebtDataProvider) => new DebtService(provider),
      inject: [PrismaDebtDataProvider],
    },
  ],
  exports: [DebtService],
})
export class DebtModule {}
