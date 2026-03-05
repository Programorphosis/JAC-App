import { Injectable } from '@nestjs/common';
import {
  PaymentRegistrationRunner,
  RegistrarPagoCartaParams as RunnerCartaParams,
} from '../../infrastructure/payment/payment-registration-runner.service';
import { DebtService } from '../../domain/services/debt.service';
import { PrismaService } from '../../prisma/prisma.service';
import { WompiService } from '../../infrastructure/wompi/wompi.service';
import type { WompiCredenciales } from '../../infrastructure/wompi/wompi.types';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import {
  DeudaCeroError,
  PagoDuplicadoError,
  UsuarioNoEncontradoError,
  UsuarioInactivoError,
  IntencionPagoNoEncontradaError,
  WompiNoConfiguradoError,
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
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Valida que el usuario esté activo. Usuario inactivo no puede pagar ni solicitar carta.
   * CHECKLIST_OPERACION_JUNTAS §2.1, PLAN_IMPLEMENTACION_OPERACION Fase 1.1
   */
  private async validarUsuarioActivo(
    usuarioId: string,
    juntaId: string,
  ): Promise<void> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
      select: { activo: true },
    });
    if (!usuario) {
      throw new UsuarioNoEncontradoError(usuarioId);
    }
    if (!usuario.activo) {
      throw new UsuarioInactivoError(usuarioId);
    }
  }

  /**
   * Obtiene credenciales Wompi de la junta (desencriptadas).
   * WOMPI_POR_JUNTA_DOC §4.1
   * publicKey: para checkout URL si el payment link no lo provee (evita Formato inválido).
   */
  private async obtenerCredencialesWompiJunta(
    juntaId: string,
  ): Promise<WompiCredenciales & { publicKey?: string }> {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
      select: {
        wompiPrivateKey: true,
        wompiPublicKey: true,
        wompiEnvironment: true,
      },
    });
    if (!junta?.wompiPrivateKey) {
      throw new WompiNoConfiguradoError(juntaId);
    }
    const privateKey = this.encryption.decrypt(junta.wompiPrivateKey);
    const environment = (junta.wompiEnvironment || 'sandbox') as
      | 'sandbox'
      | 'production';
    let publicKey: string | undefined;
    if (junta.wompiPublicKey) {
      const raw = this.encryption.decrypt(junta.wompiPublicKey).trim();
      // Wompi: pub_test_xxx o pub_prod_xxx, solo alfanuméricos y guiones bajos
      if (/^pub_(test|prod)_[a-zA-Z0-9_]+$/.test(raw)) {
        publicKey = raw;
      }
    }
    return { privateKey, environment, publicKey };
  }

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
      if (filtros.fechaDesde)
        (where.fechaPago as Record<string, Date>).gte = filtros.fechaDesde;
      if (filtros.fechaHasta)
        (where.fechaPago as Record<string, Date>).lte = filtros.fechaHasta;
    }
    if (filtros?.search && filtros.search.trim().length >= 2) {
      const term = filtros.search.trim();
      const isNum = /^\d+$/.test(term);
      where.OR = [
        { usuario: { nombres: { contains: term, mode: 'insensitive' } } },
        { usuario: { apellidos: { contains: term, mode: 'insensitive' } } },
        {
          usuario: { numeroDocumento: { contains: term, mode: 'insensitive' } },
        },
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
   * Exporta pagos a CSV con los mismos filtros que listar.
   * Límite: 10.000 registros. Para contabilidad externa.
   */
  async exportarCsv(
    juntaId: string,
    filtros?: {
      usuarioId?: string;
      tipo?: TipoPago;
      fechaDesde?: Date;
      fechaHasta?: Date;
      search?: string;
    },
  ): Promise<{ data: string; filename: string }> {
    const MAX_EXPORT = 10_000;
    const where: Record<string, unknown> = { juntaId };

    if (filtros?.usuarioId) where.usuarioId = filtros.usuarioId;
    if (filtros?.tipo) where.tipo = filtros.tipo;
    if (filtros?.fechaDesde || filtros?.fechaHasta) {
      where.fechaPago = {};
      if (filtros.fechaDesde)
        (where.fechaPago as Record<string, Date>).gte = filtros.fechaDesde;
      if (filtros.fechaHasta)
        (where.fechaPago as Record<string, Date>).lte = filtros.fechaHasta;
    }
    if (filtros?.search && filtros.search.trim().length >= 2) {
      const term = filtros.search.trim();
      const isNum = /^\d+$/.test(term);
      where.OR = [
        { usuario: { nombres: { contains: term, mode: 'insensitive' } } },
        { usuario: { apellidos: { contains: term, mode: 'insensitive' } } },
        {
          usuario: { numeroDocumento: { contains: term, mode: 'insensitive' } },
        },
        { referenciaExterna: { contains: term, mode: 'insensitive' } },
        ...(isNum ? [{ consecutivo: parseInt(term, 10) }] : []),
      ];
    }

    const pagos = await this.prisma.pago.findMany({
      where,
      take: MAX_EXPORT,
      orderBy: { fechaPago: 'desc' },
      select: {
        fechaPago: true,
        tipo: true,
        metodo: true,
        monto: true,
        consecutivo: true,
        referenciaExterna: true,
        usuario: {
          select: { nombres: true, apellidos: true, numeroDocumento: true },
        },
        registradoPor: { select: { nombres: true, apellidos: true } },
      },
    });

    const escape = (
      v: string | number | boolean | null | undefined,
    ): string => {
      if (v == null) return '';
      const s = String(v).replace(/"/g, '""');
      return `"${s}"`;
    };

    const lines: string[] = [];
    lines.push(
      'Fecha,Tipo,Método,Monto,Consecutivo,Referencia,Usuario,Registrado por',
    );
    for (const p of pagos) {
      const fecha = p.fechaPago
        ? new Date(p.fechaPago).toISOString().slice(0, 10)
        : '';
      const usuario = p.usuario
        ? `${p.usuario.nombres} ${p.usuario.apellidos} (${p.usuario.numeroDocumento})`
        : '';
      const reg = p.registradoPor
        ? `${p.registradoPor.nombres} ${p.registradoPor.apellidos}`
        : '';
      lines.push(
        [
          escape(fecha),
          escape(p.tipo),
          escape(p.metodo),
          p.monto,
          p.consecutivo,
          escape(p.referenciaExterna),
          escape(usuario),
          escape(reg),
        ].join(','),
      );
    }

    const fecha = new Date().toISOString().slice(0, 10);
    const filename = `pagos_${fecha}.csv`;
    return {
      data: '\uFEFF' + lines.join('\n'),
      filename,
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
    await this.validarUsuarioActivo(params.usuarioId, params.juntaId);
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
    await this.validarUsuarioActivo(params.usuarioId, params.juntaId);
    return this.paymentRunner.registerCartaPayment(params as RunnerCartaParams);
  }

  private generarReferencia(): string {
    return `JAC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  }

  async crearIntencionPagoOnline(params: CrearIntencionPagoParams) {
    const { usuarioId, juntaId, iniciadoPorId } = params;

    await this.validarUsuarioActivo(usuarioId, juntaId);

    const deuda = await this.debtService.calculateUserDebt({
      usuarioId,
      juntaId,
    });

    if (deuda.total === 0) {
      throw new DeudaCeroError(usuarioId);
    }

    const credenciales = await this.obtenerCredencialesWompiJunta(juntaId);
    const baseRedirect =
      process.env.WOMPI_REDIRECT_URL || 'http://localhost:4200/pagos/retorno';
    const redirectUrl = `${baseRedirect}?junta_id=${juntaId}`;

    const montoCents = deuda.total * 100;
    const referencia = this.generarReferencia();

    const link = await this.wompi.crearPaymentLink(
      {
        name: `Pago cuota junta - ${referencia}`,
        description: 'Pago de cuota de junta de acción comunal',
        amountInCents: montoCents,
        currency: 'COP',
        singleUse: true,
        redirectUrl,
        sku: referencia,
      },
      credenciales,
    );

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

    const baseCheckout = `https://checkout.wompi.co/l/${link.id}`;
    const checkoutUrl = credenciales.publicKey
      ? `${baseCheckout}?public-key=${encodeURIComponent(credenciales.publicKey)}`
      : baseCheckout;

    return {
      checkoutUrl,
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

    await this.validarUsuarioActivo(usuarioId, juntaId);

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

    const credenciales = await this.obtenerCredencialesWompiJunta(juntaId);
    const baseRedirect =
      process.env.WOMPI_REDIRECT_URL || 'http://localhost:4200/pagos/retorno';
    const redirectUrl = `${baseRedirect}?junta_id=${juntaId}`;

    const montoCents = junta!.montoCarta! * 100;
    const referencia = this.generarReferencia();

    const link = await this.wompi.crearPaymentLink(
      {
        name: `Pago carta laboral - ${referencia}`,
        description: 'Pago de carta laboral - Junta de Acción Comunal',
        amountInCents: montoCents,
        currency: 'COP',
        singleUse: true,
        redirectUrl,
        sku: referencia,
      },
      credenciales,
    );

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

    const baseCheckoutCarta = `https://checkout.wompi.co/l/${link.id}`;
    const checkoutUrlCarta = credenciales.publicKey
      ? `${baseCheckoutCarta}?public-key=${encodeURIComponent(credenciales.publicKey)}`
      : baseCheckoutCarta;

    return {
      checkoutUrl: checkoutUrlCarta,
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

    await this.validarUsuarioActivo(intencion.usuarioId, intencion.juntaId);

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
   * WOMPI_POR_JUNTA_DOC §4.3: usa credenciales de la junta.
   * codigo: para que el frontend muestre el mensaje correcto al usuario.
   */
  async consultarYRegistrarSiAprobado(
    transactionId: string,
    juntaId: string,
  ): Promise<VerificarPagoResult> {
    const credenciales = await this.obtenerCredencialesWompiJunta(juntaId);
    const tx = await this.wompi.obtenerTransaccion(transactionId, credenciales);
    if (!tx) {
      return {
        registrado: false,
        codigo: 'TRANSACCION_NO_ENCONTRADA',
        mensaje:
          'No se pudo consultar la transacción en Wompi. Verifica que el ID sea correcto o intenta más tarde.',
      };
    }
    if (tx.status !== 'APPROVED') {
      const codigo = this.codigoEstadoWompi(tx.status);
      const mensaje = this.mensajeEstadoWompi(tx.status);
      return { registrado: false, codigo, mensaje, status: tx.status };
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
        codigo: 'REGISTRADO_AHORA',
        pagoId: result.pagoId,
        monto: result.monto,
        consecutivo: result.consecutivo,
        mensaje: 'Pago registrado correctamente.',
      };
    } catch (err) {
      if (err instanceof PagoDuplicadoError) {
        return {
          registrado: true,
          codigo: 'YA_REGISTRADO',
          pagoId: '',
          monto: 0,
          consecutivo: 0,
          mensaje:
            'El pago ya fue registrado correctamente. Puedes verlo en el listado de pagos.',
        };
      }
      if (err instanceof IntencionPagoNoEncontradaError) {
        return {
          registrado: false,
          codigo: 'INTENCION_NO_ENCONTRADA',
          status: tx.status,
          mensaje:
            'No se encontró la intención de pago o el monto no coincide. Contacta al administrador.',
        };
      }
      if (err instanceof UsuarioInactivoError) {
        return {
          registrado: false,
          codigo: 'USUARIO_INACTIVO',
          status: tx.status,
          mensaje:
            'El usuario está inactivo. Active el usuario para poder registrar el pago.',
        };
      }
      throw err;
    }
  }

  private codigoEstadoWompi(status: string): VerificarPagoCodigo {
    const pendientes = ['PENDING', 'IN_PROCESS', 'CREATED'];
    const rechazados = ['DECLINED', 'VOIDED', 'ERROR'];
    if (pendientes.includes(status)) return 'TRANSACCION_PENDIENTE';
    if (rechazados.includes(status)) return 'TRANSACCION_RECHAZADA';
    return 'ESTADO_DESCONOCIDO';
  }

  private mensajeEstadoWompi(status: string): string {
    const pendientes = ['PENDING', 'IN_PROCESS', 'CREATED'];
    const rechazados = ['DECLINED', 'VOIDED', 'ERROR'];
    if (pendientes.includes(status)) {
      return 'El pago está pendiente de procesamiento. Si ya pagaste, espera unos minutos y vuelve a verificar.';
    }
    if (rechazados.includes(status)) {
      return 'El pago no fue aprobado. Si crees que es un error, contacta a tu entidad financiera o intenta con otro método.';
    }
    return `Estado del pago: ${status}. Si ya pagaste, contacta al administrador.`;
  }
}

/** Códigos para que el frontend muestre el mensaje correcto en retorno de pago. */
export type VerificarPagoCodigo =
  | 'REGISTRADO_AHORA'
  | 'YA_REGISTRADO'
  | 'TRANSACCION_NO_ENCONTRADA'
  | 'TRANSACCION_PENDIENTE'
  | 'TRANSACCION_RECHAZADA'
  | 'INTENCION_NO_ENCONTRADA'
  | 'USUARIO_INACTIVO'
  | 'ESTADO_DESCONOCIDO';

export interface VerificarPagoResult {
  registrado: boolean;
  codigo: VerificarPagoCodigo;
  mensaje: string;
  pagoId?: string;
  monto?: number;
  consecutivo?: number;
  status?: string;
}
