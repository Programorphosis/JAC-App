import { Module } from '@nestjs/common';
import { PrismaModule } from '../../prisma/prisma.module';
import { PaymentService } from '../../domain/services/payment.service';
import { PaymentRegistrationRunner } from './payment-registration-runner.service';

@Module({
  imports: [PrismaModule],
  providers: [PaymentService, PaymentRegistrationRunner],
  exports: [PaymentService, PaymentRegistrationRunner],
})
export class PaymentModule {}
