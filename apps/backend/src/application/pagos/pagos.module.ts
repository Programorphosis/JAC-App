import { Module } from '@nestjs/common';
import { PagosController } from './pagos.controller';
import { PagosService } from './pagos.service';
import { PaymentModule } from '../../infrastructure/payment/payment.module';
import { DebtModule } from '../../infrastructure/debt/debt.module';
import { WompiModule } from '../../infrastructure/wompi/wompi.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PaymentModule, DebtModule, WompiModule, PrismaModule],
  controllers: [PagosController],
  providers: [PagosService],
  exports: [PagosService],
})
export class PagosModule {}
