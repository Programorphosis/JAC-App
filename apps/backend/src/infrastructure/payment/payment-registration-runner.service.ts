import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PagoDuplicadoError } from '../../domain/errors';
import { validateCartaPagoPreconditions } from '../../domain/helpers/carta-pago-validation.helper';
import { PaymentService } from '../../domain/services/payment.service';
import { PrismaPaymentRegistrationContext } from './prisma-payment-registration-context.service';
import type { RegisterJuntaPaymentParams } from '../../domain/types/payment.types';
import type { RegisterJuntaPaymentResult } from '../../domain/types/payment.types';

export interface RegistrarPagoCartaParams {
  usuarioId: string;
  juntaId: string;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'ONLINE';
  registradoPorId: string;
  referenciaExterna?: string;
}

/**
 * Orquesta el registro de pago JUNTA o CARTA dentro de una transacción.
 * Referencia: flujoDePagosCondicionDeCarrera.md, flujoSolicitudCarta.md
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

  /**
   * Registra pago tipo CARTA. Monto desde Junta.montoCarta (nunca desde frontend).
   * Idempotente por referenciaExterna. Serializable para consistencia con JUNTA.
   */
  async registerCartaPayment(params: RegistrarPagoCartaParams): Promise<{
    pagoId: string;
    monto: number;
    consecutivo: number;
  }> {
    return this.prisma.$transaction(
      async (tx) => {
        const ctx = new PrismaPaymentRegistrationContext(tx);

        if (params.referenciaExterna) {
          const existente = await ctx.findPagoByReferenciaExterna(
            params.referenciaExterna,
          );
          if (existente) {
            throw new PagoDuplicadoError(params.referenciaExterna);
          }
        }

        const [junta, usuario] = await Promise.all([
          tx.junta.findUnique({
            where: { id: params.juntaId },
            select: { montoCarta: true },
          }),
          tx.usuario.findFirst({
            where: { id: params.usuarioId, juntaId: params.juntaId },
          }),
        ]);

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);
        const [cartaPendiente, tienePagoVigente, cartaVigente] = await Promise.all([
          tx.carta.findFirst({
            where: {
              usuarioId: params.usuarioId,
              juntaId: params.juntaId,
              estado: 'PENDIENTE',
            },
          }),
          tx.pago.findFirst({
            where: {
              usuarioId: params.usuarioId,
              juntaId: params.juntaId,
              tipo: 'CARTA',
              vigencia: true,
            },
          }),
          tx.carta.findFirst({
            where: {
              usuarioId: params.usuarioId,
              juntaId: params.juntaId,
              estado: 'APROBADA',
              vigenciaHasta: { gte: hoy },
            },
          }),
        ]);

        validateCartaPagoPreconditions({
          junta,
          usuario,
          cartaPendiente,
          tienePagoVigente,
          cartaVigente,
          usuarioId: params.usuarioId,
          juntaId: params.juntaId,
        });

        const montoCarta = junta!.montoCarta!;
        const consecutivo = await ctx.getNextConsecutivoPagoCarta(params.juntaId);
        const { pagoId } = await ctx.createCartaPayment({
          usuarioId: params.usuarioId,
          juntaId: params.juntaId,
          monto: montoCarta,
          metodo: params.metodo,
          registradoPorId: params.registradoPorId,
          referenciaExterna: params.referenciaExterna,
          consecutivo,
        });

        await ctx.registerAudit({
          juntaId: params.juntaId,
          entidad: 'Pago',
          entidadId: pagoId,
          accion: 'REGISTRO_PAGO_CARTA',
          metadata: {
            usuarioId: params.usuarioId,
            monto: montoCarta,
            metodo: params.metodo,
            consecutivo,
            referenciaExterna: params.referenciaExterna ?? null,
          },
          ejecutadoPorId: params.registradoPorId,
        });

        return {
          pagoId,
          monto: montoCarta,
          consecutivo,
        };
      },
    { isolationLevel: 'Serializable' },
  );
  }
}
