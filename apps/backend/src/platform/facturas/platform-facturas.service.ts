import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../domain/services/audit.service';
import { WompiService } from '../../infrastructure/wompi/wompi.service';
import {
  EstadoFactura,
  TipoFactura,
  MetodoPagoFactura,
  EstadoSuscripcion,
} from '@prisma/client';
import type { CrearFacturaDto } from '../dto/crear-factura.dto';
import type { RegistrarPagoFacturaDto } from '../dto/registrar-pago-factura.dto';

/** DTO interno con facturaId añadido por el controller. */
export type RegistrarPagoFacturaDtoConId = RegistrarPagoFacturaDto & { facturaId: string };

/**
 * Servicio de facturación plataforma (PA-6).
 * Facturas por junta, pagos al proveedor, job mensual.
 * Pago online: FACTURACION_PLATAFORMA_PAGO_ONLINE_ANALISIS.md
 */
@Injectable()
export class PlatformFacturasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly wompi: WompiService,
  ) {}

  /** Lista facturas de una junta. */
  async listarFacturas(
    juntaId: string,
    page = 1,
    limit = 20,
    estado?: EstadoFactura,
  ) {
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const skip = (page - 1) * limit;
    const where = { juntaId, ...(estado ? { estado } : {}) };

    const [facturas, total] = await Promise.all([
      this.prisma.factura.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaEmision: 'desc' },
        include: {
          suscripcion: { select: { id: true, plan: { select: { nombre: true } } } },
          creadoPor: { select: { nombres: true, apellidos: true } },
          pagos: { select: { id: true, monto: true, fecha: true, metodo: true } },
          _count: { select: { pagos: true } },
        },
      }),
      this.prisma.factura.count({ where }),
    ]);

    return {
      data: facturas,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /** Lista facturas pendientes de pago (PENDIENTE, VENCIDA, PARCIAL) para la junta. */
  async listarFacturasPendientes(juntaId: string, limit = 10) {
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) return { data: [] };

    const facturas = await this.prisma.factura.findMany({
      where: {
        juntaId,
        estado: {
          in: [
            EstadoFactura.PENDIENTE,
            EstadoFactura.VENCIDA,
            EstadoFactura.PARCIAL,
          ],
        },
      },
      take: limit,
      orderBy: { fechaVencimiento: 'asc' },
      include: {
        suscripcion: { select: { id: true, plan: { select: { nombre: true } } } },
        pagos: { select: { id: true, monto: true } },
      },
    });

    return { data: facturas };
  }

  /** Crea factura manual para junta. */
  async crearFactura(
    juntaId: string,
    dto: CrearFacturaDto,
    ejecutadoPorId: string,
  ) {
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    if (dto.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    const fechaVencimiento = new Date(dto.fechaVencimiento);
    if (isNaN(fechaVencimiento.getTime())) {
      throw new BadRequestException('Fecha de vencimiento inválida');
    }

    const factura = await this.prisma.factura.create({
      data: {
        juntaId,
        monto: dto.monto,
        fechaVencimiento,
        estado: EstadoFactura.PENDIENTE,
        tipo: dto.tipo ?? TipoFactura.MANUAL,
        referenciaExterna: dto.referenciaExterna ?? null,
        metadata: (dto.metadata ?? undefined) as Prisma.InputJsonValue | undefined,
        creadoPorId: ejecutadoPorId,
      },
      include: {
        suscripcion: { select: { id: true, plan: { select: { nombre: true } } } },
        creadoPor: { select: { nombres: true, apellidos: true } },
      },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Factura',
      entidadId: factura.id,
      accion: 'CREACION_FACTURA',
      metadata: {
        monto: dto.monto,
        tipo: factura.tipo,
        referenciaExterna: dto.referenciaExterna,
      },
      ejecutadoPorId,
    });

    return { data: factura };
  }

  /** Historial de pagos de facturas (pagos al proveedor) de una junta. */
  async listarPagosPlataforma(juntaId: string, page = 1, limit = 20) {
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const skip = (page - 1) * limit;

    const [pagos, total] = await Promise.all([
      this.prisma.pagoFactura.findMany({
        where: { factura: { juntaId } },
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          factura: {
            select: {
              id: true,
              monto: true,
              fechaEmision: true,
              fechaVencimiento: true,
              estado: true,
              tipo: true,
            },
          },
        },
      }),
      this.prisma.pagoFactura.count({
        where: { factura: { juntaId } },
      }),
    ]);

    return {
      data: pagos,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  /**
   * Crea intención de pago online de factura (junta → plataforma).
   * Usa credenciales WOMPI_* de env (cuenta plataforma).
   * FACTURACION_PLATAFORMA_PAGO_ONLINE_ANALISIS.md
   */
  async crearIntencionPagoFactura(
    facturaId: string,
    juntaId: string,
    iniciadoPorId: string,
  ): Promise<{ checkoutUrl: string; referencia: string }> {
    const factura = await this.prisma.factura.findFirst({
      where: { id: facturaId, juntaId },
      include: { pagos: true },
    });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    if (factura.estado === EstadoFactura.PAGADA) {
      throw new BadRequestException('La factura ya está pagada');
    }
    if (factura.estado === EstadoFactura.CANCELADA) {
      throw new BadRequestException('No se pueden pagar facturas canceladas');
    }

    const totalPagado = factura.pagos.reduce((s, p) => s + p.monto, 0);
    const montoPendiente = factura.monto - totalPagado;
    if (montoPendiente <= 0) {
      throw new BadRequestException('No hay monto pendiente por pagar');
    }

    const montoCents = montoPendiente * 100;
    const referencia = `FAC-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const baseRedirect =
      process.env.WOMPI_REDIRECT_URL_FACTURAS ||
      (process.env.WOMPI_REDIRECT_URL
        ? process.env.WOMPI_REDIRECT_URL.replace('/pagos/retorno', '/facturas-plataforma/retorno')
        : 'http://localhost:4200/facturas-plataforma/retorno');
    const redirectUrl = `${baseRedirect}?factura_id=${facturaId}`;

    const link = await this.wompi.crearPaymentLink(
      {
        name: `Pago factura plataforma - ${referencia}`,
        description: 'Pago de factura de suscripción a la plataforma',
        amountInCents: montoCents,
        currency: 'COP',
        singleUse: true,
        redirectUrl,
        sku: referencia,
      },
      undefined, // usa credenciales env (plataforma)
    );

    await this.prisma.intencionPagoFactura.create({
      data: {
        facturaId,
        juntaId,
        montoCents,
        wompiLinkId: link.id,
        iniciadoPorId,
      },
    });

    const publicKey = process.env.WOMPI_PUBLIC_KEY;
    const baseCheckout = `https://checkout.wompi.co/l/${link.id}`;
    const checkoutUrl = publicKey
      ? `${baseCheckout}?public-key=${encodeURIComponent(publicKey)}`
      : baseCheckout;

    return { checkoutUrl, referencia };
  }

  /**
   * Registra pago de factura desde proveedor (webhook o retorno).
   * Idempotente por referenciaExterna = transactionId.
   * FACTURACION_PLATAFORMA_PAGO_ONLINE_ANALISIS.md
   */
  async registrarPagoDesdeProveedorFactura(params: {
    transactionId: string;
    amountInCents: number;
    paymentLinkId: string;
  }): Promise<{ yaRegistrado: boolean }> {
    const { transactionId, amountInCents, paymentLinkId } = params;

    const intencion = await this.prisma.intencionPagoFactura.findUnique({
      where: { wompiLinkId: paymentLinkId },
      include: { factura: { include: { pagos: true } } },
    });

    if (!intencion || intencion.montoCents !== amountInCents) {
      throw new BadRequestException('Intención de pago no encontrada o monto no coincide');
    }

    const factura = intencion.factura;
    const existePago = factura.pagos.some((p) => p.referenciaExterna === transactionId);
    if (existePago) {
      return { yaRegistrado: true };
    }

    const monto = Math.round(amountInCents / 100);
    await this.registrarPago(
      intencion.juntaId,
      {
        facturaId: factura.id,
        monto,
        metodo: MetodoPagoFactura.ONLINE,
        referenciaExterna: transactionId,
      },
      intencion.iniciadoPorId,
    );

    return { yaRegistrado: false };
  }

  /**
   * Consulta transacción en Wompi y registra pago si está APPROVED.
   * Rescate cuando el webhook no llegó o falló.
   */
  async consultarYRegistrarPagoFactura(
    transactionId: string,
    facturaId: string,
    juntaId: string,
  ): Promise<{
    registrado: boolean;
    codigo: string;
    mensaje: string;
    estado?: string;
  }> {
    const factura = await this.prisma.factura.findFirst({
      where: { id: facturaId, juntaId },
      include: { pagos: true },
    });
    if (!factura) {
      return { registrado: false, codigo: 'FACTURA_NO_ENCONTRADA', mensaje: 'Factura no encontrada' };
    }

    const tx = await this.wompi.obtenerTransaccion(transactionId, undefined);
    if (!tx) {
      return {
        registrado: false,
        codigo: 'TRANSACCION_NO_ENCONTRADA',
        mensaje: 'No se pudo consultar la transacción',
      };
    }

    if (tx.status !== 'APPROVED') {
      return {
        registrado: false,
        codigo: 'TRANSACCION_NO_APROBADA',
        mensaje: `Estado: ${tx.status}`,
        estado: tx.status,
      };
    }

    const paymentLinkId = tx.payment_link_id ?? null;
    if (!paymentLinkId) {
      return {
        registrado: false,
        codigo: 'SIN_PAYMENT_LINK',
        mensaje: 'Transacción sin payment_link_id',
      };
    }

    const intencion = await this.prisma.intencionPagoFactura.findUnique({
      where: { wompiLinkId: paymentLinkId },
    });
    if (!intencion || intencion.facturaId !== facturaId) {
      return {
        registrado: false,
        codigo: 'INTENCION_NO_COINCIDE',
        mensaje: 'La transacción no corresponde a esta factura',
      };
    }

    const { yaRegistrado } = await this.registrarPagoDesdeProveedorFactura({
      transactionId: tx.id,
      amountInCents: tx.amount_in_cents,
      paymentLinkId,
    });

    return {
      registrado: true,
      codigo: yaRegistrado ? 'YA_REGISTRADO' : 'REGISTRADO_AHORA',
      mensaje: yaRegistrado ? 'El pago ya estaba registrado' : 'Pago registrado correctamente',
    };
  }

  /** Registra un pago sobre una factura. */
  async registrarPago(
    juntaId: string,
    dto: RegistrarPagoFacturaDtoConId,
    ejecutadoPorId: string,
  ) {
    const factura = await this.prisma.factura.findFirst({
      where: { id: dto.facturaId, juntaId },
      include: { pagos: true },
    });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    if (factura.estado === EstadoFactura.PAGADA) {
      throw new BadRequestException('La factura ya está pagada');
    }
    if (factura.estado === EstadoFactura.CANCELADA) {
      throw new BadRequestException('No se pueden registrar pagos en facturas canceladas');
    }

    if (dto.monto <= 0) {
      throw new BadRequestException('El monto debe ser mayor a cero');
    }

    const totalPagado = factura.pagos.reduce((s, p) => s + p.monto, 0);
    const nuevoTotal = totalPagado + dto.monto;

    if (nuevoTotal > factura.monto) {
      throw new BadRequestException(
        `El pago excede el monto pendiente. Pendiente: ${factura.monto - totalPagado} COP`,
      );
    }

    const pago = await this.prisma.pagoFactura.create({
      data: {
        facturaId: factura.id,
        monto: dto.monto,
        metodo: dto.metodo,
        referencia: dto.referencia ?? null,
        referenciaExterna: dto.referenciaExterna ?? null,
      },
    });

    const nuevoEstado =
      nuevoTotal >= factura.monto ? EstadoFactura.PAGADA : EstadoFactura.PARCIAL;

    await this.prisma.factura.update({
      where: { id: factura.id },
      data: { estado: nuevoEstado },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'PagoFactura',
      entidadId: pago.id,
      accion: 'PAGO_FACTURA',
      metadata: {
        facturaId: factura.id,
        monto: dto.monto,
        metodo: dto.metodo,
        totalPagado: nuevoTotal,
        estadoFactura: nuevoEstado,
      },
      ejecutadoPorId,
    });

    const facturaActualizada = await this.prisma.factura.findUnique({
      where: { id: factura.id },
      include: {
        pagos: true,
        suscripcion: { select: { id: true, plan: { select: { nombre: true } } } },
      },
    });

    return { data: { pago, factura: facturaActualizada } };
  }

  /** Cancela una factura (solo PENDIENTE o VENCIDA). */
  async cancelarFactura(juntaId: string, facturaId: string, ejecutadoPorId: string) {
    const factura = await this.prisma.factura.findFirst({
      where: { id: facturaId, juntaId },
      include: { pagos: true },
    });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    if (factura.estado === EstadoFactura.PAGADA) {
      throw new BadRequestException('No se puede cancelar una factura ya pagada');
    }
    if (factura.estado === EstadoFactura.CANCELADA) {
      throw new BadRequestException('La factura ya está cancelada');
    }

    await this.prisma.factura.update({
      where: { id: facturaId },
      data: { estado: EstadoFactura.CANCELADA },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Factura',
      entidadId: factura.id,
      accion: 'CANCELACION_FACTURA',
      metadata: { estadoAnterior: factura.estado },
      ejecutadoPorId,
    });

    const actualizada = await this.prisma.factura.findUnique({
      where: { id: facturaId },
      include: {
        pagos: true,
        suscripcion: { select: { id: true, plan: { select: { nombre: true } } } },
      },
    });

    return { data: actualizada };
  }

  /** Reactiva una factura cancelada (solo si no tiene pagos y está en vigencia). */
  async reactivarFactura(juntaId: string, facturaId: string, ejecutadoPorId: string) {
    const factura = await this.prisma.factura.findFirst({
      where: { id: facturaId, juntaId },
      include: { pagos: true },
    });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    if (factura.estado !== EstadoFactura.CANCELADA) {
      throw new BadRequestException('Solo se pueden reactivar facturas canceladas');
    }

    const totalPagado = factura.pagos.reduce((s, p) => s + p.monto, 0);
    if (totalPagado > 0) {
      throw new BadRequestException(
        'No se puede reactivar una factura con pagos registrados',
      );
    }

    const ahora = new Date();
    if (new Date(factura.fechaVencimiento) < ahora) {
      throw new BadRequestException(
        'No se puede reactivar una factura vencida. Cree una nueva factura.',
      );
    }

    const nuevoEstado = EstadoFactura.PENDIENTE;

    await this.prisma.factura.update({
      where: { id: facturaId },
      data: { estado: nuevoEstado },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Factura',
      entidadId: factura.id,
      accion: 'REACTIVACION_FACTURA',
      metadata: { estadoAnterior: EstadoFactura.CANCELADA },
      ejecutadoPorId,
    });

    const actualizada = await this.prisma.factura.findUnique({
      where: { id: facturaId },
      include: {
        pagos: true,
        suscripcion: { select: { id: true, plan: { select: { nombre: true } } } },
      },
    });

    return { data: actualizada };
  }

  /** Genera facturas mensuales para suscripciones activas (job). */
  async generarFacturasMensuales(ejecutadoPorId: string): Promise<{
    generadas: number;
    omitidas: number;
    errores: string[];
  }> {
    const ahora = new Date();
    const mesActual = ahora.getMonth();
    const anioActual = ahora.getFullYear();
    const inicioMes = new Date(anioActual, mesActual, 1);
    const finMes = new Date(anioActual, mesActual + 1, 0, 23, 59, 59);

    const suscripciones = await this.prisma.suscripcion.findMany({
      where: {
        estado: { in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.PRUEBA] },
        fechaVencimiento: { gte: inicioMes },
      },
      include: { plan: true, junta: { select: { id: true, nombre: true } } },
    });

    let generadas = 0;
    let omitidas = 0;
    const errores: string[] = [];

    for (const susc of suscripciones) {
      const yaFacturada = await this.prisma.factura.findFirst({
        where: {
          suscripcionId: susc.id,
          tipo: TipoFactura.MENSUAL,
          fechaEmision: { gte: inicioMes, lte: finMes },
        },
      });

      if (yaFacturada) {
        omitidas++;
        continue;
      }

      try {
        const fechaVencimiento = new Date(anioActual, mesActual + 1, 10);

        const factura = await this.prisma.factura.create({
          data: {
            juntaId: susc.juntaId,
            suscripcionId: susc.id,
            monto: susc.plan.precioMensual,
            fechaEmision: inicioMes,
            fechaVencimiento,
            estado: EstadoFactura.PENDIENTE,
            tipo: TipoFactura.MENSUAL,
            metadata: {
              mes: mesActual + 1,
              anio: anioActual,
              planNombre: susc.plan.nombre,
              periodo: `${anioActual}-${String(mesActual + 1).padStart(2, '0')}`,
            },
          },
        });

        await this.audit.registerEvent({
          juntaId: susc.juntaId,
          entidad: 'Factura',
          entidadId: factura.id,
          accion: 'FACTURA_MENSUAL_GENERADA',
          metadata: {
            suscripcionId: susc.id,
            planNombre: susc.plan.nombre,
            monto: susc.plan.precioMensual,
            mes: mesActual + 1,
            anio: anioActual,
          },
          ejecutadoPorId,
        });

        generadas++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errores.push(`${susc.junta.nombre}: ${msg}`);
      }
    }

    return { generadas, omitidas, errores };
  }

  /** Marca facturas PENDIENTE como VENCIDA si pasó fechaVencimiento. */
  async marcarFacturasVencidas(): Promise<number> {
    const ahora = new Date();
    const result = await this.prisma.factura.updateMany({
      where: {
        estado: EstadoFactura.PENDIENTE,
        fechaVencimiento: { lt: ahora },
      },
      data: { estado: EstadoFactura.VENCIDA },
    });
    return result.count;
  }
}
