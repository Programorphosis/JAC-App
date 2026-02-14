import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PaymentService } from '../../domain/services/payment.service';
import { PrismaPaymentRegistrationContext } from './prisma-payment-registration-context.service';
import type { RegisterJuntaPaymentParams } from '../../domain/types/payment.types';
import type { RegisterJuntaPaymentResult } from '../../domain/types/payment.types';

/**
 * Orquesta el registro de pago JUNTA dentro de una transacción serializable.
 * Referencia: flujoDePagosCondicionDeCarrera.md
 */
@Injectable()
export class PaymentRegistrationRunner {
  constructor(
    private readonly prisma: PrismaService,
    private readonly paymentService: PaymentService,
  ) {}

  async registerJuntaPayment(params: RegisterJuntaPaymentParams): Promise<RegisterJuntaPaymentResult> {
    return this.prisma.$transaction(
      async (tx) => {
        const ctx = new PrismaPaymentRegistrationContext(tx);
        return this.paymentService.registerJuntaPayment(params, ctx);
      },
      { isolationLevel: 'Serializable' },
    );
  }
}
