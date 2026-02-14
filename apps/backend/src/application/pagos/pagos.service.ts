import { Injectable } from '@nestjs/common';
import { PaymentRegistrationRunner } from '../../infrastructure/payment/payment-registration-runner.service';
import { DebtService } from '../../domain/services/debt.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WompiService } from '../../infrastructure/wompi/wompi.service';
import { DeudaCeroError, PagoDuplicadoError } from '../../domain/errors/domain.errors';

export interface RegistrarPagoEfectivoParams {
  usuarioId: string;
  juntaId: string;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA';
  registradoPorId: string;
  referenciaExterna?: string;
}

export interface CrearIntencionPagoParams {
  usuarioId: string;
  juntaId: string;
  iniciadoPorId: string;
}

@Injectable()
export class PagosService {
  constructor(
    private readonly paymentRunner: PaymentRegistrationRunner,
    private readonly debtService: DebtService,
    private readonly prisma: PrismaService,
    private readonly wompi: WompiService,
  ) {}

  async registrarPagoEfectivo(params: RegistrarPagoEfectivoParams) {
    return this.paymentRunner.registerJuntaPayment({
      usuarioId: params.usuarioId,
      juntaId: params.juntaId,
      metodo: params.metodo,
      registradoPorId: params.registradoPorId,
      referenciaExterna: params.referenciaExterna,
    });
  }

  private generarReferencia(): string {
    return `JAC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async crearIntencionPagoOnline(params: CrearIntencionPagoParams) {
    const { usuarioId, juntaId, iniciadoPorId } = params;

    const deuda = await this.debtService.calculateUserDebt({ usuarioId, juntaId });

    if (deuda.total === 0) {
      throw new DeudaCeroError(usuarioId);
    }

    const montoCents = deuda.total * 100;
    const referencia = this.generarReferencia();
    const redirectUrl = process.env.WOMPI_REDIRECT_URL || 'http://localhost:5173/pagos/retorno';

    const link = await this.wompi.crearPaymentLink({
      name: `Pago cuota junta - ${referencia}`,
      description: 'Pago de cuota de junta de acción comunal',
      amountInCents: montoCents,
      currency: 'COP',
      singleUse: true,
      redirectUrl,
      sku: referencia,
    });

    await this.prisma.intencionPago.create({
      data: {
        usuarioId,
        juntaId,
        montoCents,
        wompiLinkId: link.id,
        referencia,
        iniciadoPorId,
      },
    });

    return {
      checkoutUrl: `https://checkout.wompi.co/l/${link.id}`,
      referencia,
      monto: deuda.total,
      montoCents,
    };
  }

  /**
   * Registra pago desde proveedor (Wompi).
   * Usado por webhook, verificar retorno y futura reconciliación.
   * Idempotente por referenciaExterna = transaction.id
   */
  async registrarPagoDesdeProveedor(params: {
    transactionId: string;
    amountInCents: number;
    paymentLinkId?: string | null;
    reference?: string | null;
  }) {
    const { transactionId, amountInCents, paymentLinkId, reference } = params;

    const intencion = paymentLinkId
      ? await this.prisma.intencionPago.findUnique({
          where: { wompiLinkId: paymentLinkId },
          select: {
            usuarioId: true,
            juntaId: true,
            montoCents: true,
            iniciadoPorId: true,
          },
        })
      : reference
        ? await this.prisma.intencionPago.findFirst({
            where: { referencia: reference },
            select: {
              usuarioId: true,
              juntaId: true,
              montoCents: true,
              iniciadoPorId: true,
            },
          })
        : null;

    if (!intencion || intencion.montoCents !== amountInCents) {
      throw new Error('IntencionPago no encontrada o monto no coincide');
    }

    return this.paymentRunner.registerJuntaPayment({
      usuarioId: intencion.usuarioId,
      juntaId: intencion.juntaId,
      metodo: 'ONLINE',
      registradoPorId: intencion.iniciadoPorId,
      referenciaExterna: transactionId,
    });
  }

  /**
   * Consulta transacción en Wompi y registra pago si está APPROVED.
   * Usado en el retorno del usuario tras pagar (rescate si webhook falló).
   */
  async consultarYRegistrarSiAprobado(transactionId: string): Promise<
    | { registrado: true; pagoId: string; monto: number; consecutivo: number }
    | { registrado: false; status?: string }
  > {
    const tx = await this.wompi.obtenerTransaccion(transactionId);
    if (!tx) {
      return { registrado: false };
    }
    if (tx.status !== 'APPROVED') {
      return { registrado: false, status: tx.status };
    }

    try {
      const result = await this.registrarPagoDesdeProveedor({
        transactionId: tx.id,
        amountInCents: tx.amount_in_cents,
        paymentLinkId: tx.payment_link_id ?? undefined,
        reference: tx.reference ?? undefined,
      });
      return {
        registrado: true,
        pagoId: result.pagoId,
        monto: result.monto,
        consecutivo: result.consecutivo,
      };
    } catch (err) {
      if (err instanceof PagoDuplicadoError) {
        return { registrado: true, pagoId: '', monto: 0, consecutivo: 0 };
      }
      if (err instanceof Error && err.message.includes('no encontrada')) {
        return { registrado: false, status: tx.status };
      }
      throw err;
    }
  }
}
