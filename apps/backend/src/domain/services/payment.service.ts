/**
 * PaymentService - Registrar pago de JUNTA validando contra deuda exacta.
 * Dominio puro: no depende de Nest, Prisma ni HTTP.
 * Referencia: definicionDomainServices.md, flujoDePagosCondicionDeCarrera.md
 *
 * Nunca recibe monto desde fuera. El monto = deuda calculada dentro de la transacción.
 */
import type { IPaymentRegistrationContext } from '../ports/payment-registration-context.port';
import type {
  RegisterJuntaPaymentParams,
  RegisterJuntaPaymentResult,
} from '../types/payment.types';
import { DeudaCeroError, PagoDuplicadoError } from '../errors/domain.errors';

export class PaymentService {
  async registerJuntaPayment(
    params: RegisterJuntaPaymentParams,
    ctx: IPaymentRegistrationContext,
  ): Promise<RegisterJuntaPaymentResult> {
    const { usuarioId, juntaId, metodo, registradoPorId, referenciaExterna } = params;

    if (referenciaExterna) {
      const existente = await ctx.findPagoByReferenciaExterna(referenciaExterna);
      if (existente) {
        throw new PagoDuplicadoError(referenciaExterna);
      }
    }

    const deuda = await ctx.calculateDebt(usuarioId, juntaId);

    if (deuda.total === 0) {
      throw new DeudaCeroError(usuarioId);
    }

    const consecutivo = await ctx.getNextConsecutivoPagoJunta(juntaId);

    const { pagoId } = await ctx.createJuntaPayment({
      usuarioId,
      juntaId,
      monto: deuda.total,
      metodo,
      registradoPorId,
      referenciaExterna,
      consecutivo,
    });

    await ctx.registerAudit({
      juntaId,
      entidad: 'Pago',
      entidadId: pagoId,
      accion: 'REGISTRO_PAGO_JUNTA',
      metadata: {
        usuarioId,
        monto: deuda.total,
        metodo,
        consecutivo,
        referenciaExterna: referenciaExterna ?? null,
      },
      ejecutadoPorId: registradoPorId,
    });

    return {
      pagoId,
      monto: deuda.total,
      consecutivo,
    };
  }
}
