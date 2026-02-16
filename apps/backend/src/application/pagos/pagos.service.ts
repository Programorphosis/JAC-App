import { Injectable } from '@nestjs/common';
import {
  PaymentRegistrationRunner,
  RegistrarPagoCartaParams as RunnerCartaParams,
} from '../../infrastructure/payment/payment-registration-runner.service';
import { DebtService } from '../../domain/services/debt.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WompiService } from '../../infrastructure/wompi/wompi.service';
import {
  DeudaCeroError,
  PagoDuplicadoError,
  PagoCartaPendienteError,
  UsuarioNoEncontradoError,
  IntencionPagoNoEncontradaError,
} from '../../domain/errors';
import { validateCartaPagoPreconditions } from '../../domain/helpers/carta-pago-validation.helper';
import { TipoIntencionPago, TipoPago } from '@prisma/client';

export interface RegistrarPagoEfectivoParams {
  usuarioId: string;
  juntaId: string;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA';
  registradoPorId: string;
  referenciaExterna?: string;
}

export interface RegistrarPagoCartaParams {
  usuarioId: string;
  juntaId: string;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA' | 'ONLINE';
  registradoPorId: string;
  referenciaExterna?: string;
}

export interface CrearIntencionPagoParams {
  usuarioId: string;
  juntaId: string;
  iniciadoPorId: string;
}

export interface CrearIntencionPagoCartaParams {
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

  /**
   * Lista pagos de la junta con filtros opcionales.
   * Multi-tenant: juntaId obligatorio desde JWT.
   */
  async listar(
    juntaId: string,
    page = 1,
    limit = 20,
    filtros?: {
      usuarioId?: string;
      tipo?: TipoPago;
      fechaDesde?: Date;
      fechaHasta?: Date;
      search?: string;
      sortBy?: 'fechaPago' | 'monto' | 'tipo' | 'metodo' | 'consecutivo';
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const skip = (page - 1) * limit;
    const sortBy = filtros?.sortBy ?? 'fechaPago';
    const sortOrder = filtros?.sortOrder ?? 'desc';

    const where: Record<string, unknown> = { juntaId };

    if (filtros?.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros?.tipo) where.tipo = filtros.tipo;
    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fechaPago = {};
      if (filtros.fechaDesde) (where.fechaPago as Record<string, Date>).gte = filtros.fechaDesde;
      if (filtros.fechaHasta) (where.fechaPago as Record<string, Date>).lte = filtros.fechaHasta;
    }
    if (filtros?.search && filtros.search.trim().length >= 2) {
      const term = filtros.search.trim();
      const isNum = /^\d+$/.test(term);
      where.OR = [
        { usuario: { nombres: { contains: term, mode: 'insensitive' } } },
        { usuario: { apellidos: { contains: term, mode: 'insensitive' } } },
        { usuario: { numeroDocumento: { contains: term, mode: 'insensitive' } } },
        { referenciaExterna: { contains: term, mode: 'insensitive' } },
        ...(isNum ? [{ consecutivo: parseInt(term, 10) }] : []),
      ];
    }

    const orderBy = { [sortBy]: sortOrder };

    const [pagos, total] = await Promise.all([
      this.prisma.pago.findMany({
        where,
        skip,
        take: limit,
        orderBy,
        select: {
          id: true,
          tipo: true,
          metodo: true,
          monto: true,
          consecutivo: true,
          referenciaExterna: true,
          fechaPago: true,
          vigencia: true,
          usuario: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
              numeroDocumento: true,
            },
          },
          registradoPor: {
            select: {
              id: true,
              nombres: true,
              apellidos: true,
            },
          },
        },
      }),
      this.prisma.pago.count({ where }),
    ]);

    return {
      data: pagos.map((p) => ({
        id: p.id,
        tipo: p.tipo,
        metodo: p.metodo,
        monto: p.monto,
        consecutivo: p.consecutivo,
        referenciaExterna: p.referenciaExterna,
        fechaPago: p.fechaPago,
        vigencia: p.vigencia,
        usuarioId: p.usuario?.id,
        usuarioNombre: p.usuario
          ? `${p.usuario.nombres} ${p.usuario.apellidos} (${p.usuario.numeroDocumento})`
          : null,
        registradoPorNombre: p.registradoPor
          ? `${p.registradoPor.nombres} ${p.registradoPor.apellidos}`
          : null,
      })),
      meta: { total, page, limit },
    };
  }

  /**
   * Estadísticas contables: ingresos totales, desglose por método/tipo, por mes, por año.
   * Multi-tenant: juntaId obligatorio desde JWT.
   */
  async getEstadisticas(juntaId: string, anio?: number) {
    const whereBase = { juntaId };

    const pagosRaw = await this.prisma.pago.findMany({
      where: whereBase,
      select: {
        monto: true,
        fechaPago: true,
        tipo: true,
        metodo: true,
        usuarioId: true,
        registradoPorId: true,
      },
    });

    let total = 0;
    let totalEfectivo = 0;
    let totalTransferencia = 0;
    let totalOnline = 0;
    let totalOnlineTesorera = 0;
    let totalOnlineUsuarios = 0;
    let totalCarta = 0;
    let totalTarifa = 0;

    const anios = new Map<number, number>();
    const meses = new Map<string, number>();

    for (const p of pagosRaw) {
      total += p.monto;

      if (p.metodo === 'EFECTIVO') totalEfectivo += p.monto;
      else if (p.metodo === 'TRANSFERENCIA') totalTransferencia += p.monto;
      else if (p.metodo === 'ONLINE') {
        totalOnline += p.monto;
        if (p.registradoPorId === p.usuarioId) {
          totalOnlineUsuarios += p.monto;
        } else {
          totalOnlineTesorera += p.monto;
        }
      }

      if (p.tipo === 'CARTA') totalCarta += p.monto;
      else if (p.tipo === 'JUNTA') totalTarifa += p.monto;

      const d = new Date(p.fechaPago);
      const a = d.getFullYear();
      const m = d.getMonth() + 1;
      anios.set(a, (anios.get(a) ?? 0) + p.monto);
      const key = `${a}-${m}`;
      meses.set(key, (meses.get(key) ?? 0) + p.monto);
    }

    const porAnio: { anio: number; total: number }[] = [];
    for (const [a, tot] of anios) {
      porAnio.push({ anio: a, total: tot });
    }
    porAnio.sort((x, y) => y.anio - x.anio);

    const porMes: { mes: number; anio: number; total: number }[] = [];
    for (const [key, tot] of meses) {
      const [a, m] = key.split('-').map(Number);
      if (anio !== undefined && a !== anio) continue;
      porMes.push({ mes: m, anio: a, total: tot });
    }
    porMes.sort((x, y) => {
      if (x.anio !== y.anio) return y.anio - x.anio;
      return y.mes - x.mes;
    });

    return {
      total,
      porMetodo: {
        efectivo: totalEfectivo,
        transferencia: totalTransferencia,
        online: totalOnline,
        onlineTesorera: totalOnlineTesorera,
        onlineUsuarios: totalOnlineUsuarios,
      },
      porTipo: {
        carta: totalCarta,
        tarifa: totalTarifa,
      },
      porMes: porMes.slice(0, 24),
      porAnio: porAnio.slice(0, 5),
    };
  }

  async registrarPagoEfectivo(params: RegistrarPagoEfectivoParams) {
    return this.paymentRunner.registerJuntaPayment({
      usuarioId: params.usuarioId,
      juntaId: params.juntaId,
      metodo: params.metodo,
      registradoPorId: params.registradoPorId,
      referenciaExterna: params.referenciaExterna,
    });
  }

  /**
   * Registra pago tipo CARTA. Monto desde Junta.montoCarta.
   */
  async registrarPagoCarta(params: RegistrarPagoCartaParams) {
    return this.paymentRunner.registerCartaPayment(
      params as RunnerCartaParams,
    );
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
    const redirectUrl = process.env.WOMPI_REDIRECT_URL || 'http://localhost:4200/pagos/retorno';

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
        tipoPago: TipoIntencionPago.JUNTA,
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
   * Crea intención de pago CARTA online. Monto desde Junta.montoCarta.
   */
  async crearIntencionPagoCartaOnline(params: CrearIntencionPagoCartaParams) {
    const { usuarioId, juntaId, iniciadoPorId } = params;

    const [junta, usuario] = await Promise.all([
      this.prisma.junta.findUnique({
        where: { id: juntaId },
        select: { montoCarta: true },
      }),
      this.prisma.usuario.findFirst({
        where: { id: usuarioId, juntaId },
      }),
    ]);

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const [cartaPendiente, tienePagoVigente, cartaVigente] = await Promise.all([
      this.prisma.carta.findFirst({
        where: { usuarioId, juntaId, estado: 'PENDIENTE' },
      }),
      this.prisma.pago.findFirst({
        where: { usuarioId, juntaId, tipo: 'CARTA', vigencia: true },
      }),
      this.prisma.carta.findFirst({
        where: {
          usuarioId,
          juntaId,
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
      usuarioId,
      juntaId,
    });

    const montoCents = junta!.montoCarta! * 100;
    const referencia = this.generarReferencia();
    const redirectUrl = process.env.WOMPI_REDIRECT_URL || 'http://localhost:4200/pagos/retorno';

    const link = await this.wompi.crearPaymentLink({
      name: `Pago carta laboral - ${referencia}`,
      description: 'Pago de carta laboral - Junta de Acción Comunal',
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
        tipoPago: TipoIntencionPago.CARTA,
        montoCents,
        wompiLinkId: link.id,
        referencia,
        iniciadoPorId,
      },
    });

    return {
      checkoutUrl: `https://checkout.wompi.co/l/${link.id}`,
      referencia,
      monto: junta!.montoCarta!,
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
            tipoPago: true,
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
              tipoPago: true,
              montoCents: true,
              iniciadoPorId: true,
            },
          })
        : null;

    if (!intencion || intencion.montoCents !== amountInCents) {
      throw new IntencionPagoNoEncontradaError();
    }

    const baseParams = {
      usuarioId: intencion.usuarioId,
      juntaId: intencion.juntaId,
      metodo: 'ONLINE' as const,
      registradoPorId: intencion.iniciadoPorId,
      referenciaExterna: transactionId,
    };

    if (intencion.tipoPago === 'CARTA') {
      return this.paymentRunner.registerCartaPayment(baseParams);
    }

    return this.paymentRunner.registerJuntaPayment(baseParams);
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
      if (err instanceof IntencionPagoNoEncontradaError) {
        return { registrado: false, status: tx.status };
      }
      throw err;
    }
  }
}
