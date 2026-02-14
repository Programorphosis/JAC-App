import { TipoPago, MetodoPago } from '@prisma/client';
import type { IPaymentRegistrationContext, CreateJuntaPaymentData } from '../../domain/ports/payment-registration-context.port';
import type { DebtResult } from '../../domain/types/debt.types';
import type { RegisterAuditEventParams } from '../../domain/types/audit.types';
import { DebtService } from '../../domain/services/debt.service';
import { PrismaDebtDataProvider } from '../debt/prisma-debt-data-provider.service';

/** Cliente de transacción Prisma (parámetro del callback de $transaction). */
type PrismaTx = Omit<
  import('@prisma/client').PrismaClient,
  '$on' | '$connect' | '$disconnect' | '$transaction' | '$extends'
>;

/**
 * Contexto de registro de pago que usa un cliente Prisma (puede ser tx).
 * Referencia: flujoDePagosCondicionDeCarrera.md
 */
export class PrismaPaymentRegistrationContext implements IPaymentRegistrationContext {
  private readonly debtService: DebtService;

  constructor(
    private readonly client: PrismaTx,
  ) {
    const provider = new PrismaDebtDataProvider(client);
    this.debtService = new DebtService(provider);
  }

  async calculateDebt(usuarioId: string, juntaId: string): Promise<DebtResult> {
    return this.debtService.calculateUserDebt({ usuarioId, juntaId });
  }

  async createJuntaPayment(data: CreateJuntaPaymentData): Promise<{ pagoId: string }> {
    const pago = await this.client.pago.create({
      data: {
        juntaId: data.juntaId,
        usuarioId: data.usuarioId,
        tipo: TipoPago.JUNTA,
        metodo: data.metodo as MetodoPago,
        monto: data.monto,
        consecutivo: data.consecutivo,
        referenciaExterna: data.referenciaExterna ?? null,
        registradoPorId: data.registradoPorId,
      },
      select: { id: true },
    });
    return { pagoId: pago.id };
  }

  async registerAudit(params: RegisterAuditEventParams): Promise<void> {
    await this.client.auditoria.create({
      data: {
        juntaId: params.juntaId,
        entidad: params.entidad,
        entidadId: params.entidadId,
        accion: params.accion,
        metadata: params.metadata as object,
        ejecutadoPorId: params.ejecutadoPorId,
      },
    });
  }

  async findPagoByReferenciaExterna(referenciaExterna: string): Promise<{ id: string } | null> {
    const pago = await this.client.pago.findUnique({
      where: { referenciaExterna },
      select: { id: true },
    });
    return pago;
  }

  async getNextConsecutivoPagoJunta(juntaId: string): Promise<number> {
    const anio = new Date().getFullYear();
    const tipo = 'PAGO_JUNTA';

    const existente = await this.client.consecutivo.findUnique({
      where: {
        juntaId_tipo_anio: { juntaId, tipo, anio },
      },
    });

    if (!existente) {
      await this.client.consecutivo.create({
        data: { juntaId, tipo, anio, valorActual: 1 },
      });
      return 1;
    }

    const actualizado = await this.client.consecutivo.update({
      where: { id: existente.id },
      data: { valorActual: { increment: 1 } },
    });
    return actualizado.valorActual;
  }
}
