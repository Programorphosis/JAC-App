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
import {
  calcularFechaVencimiento,
  getEstadoSuscripcion,
} from '../../common/utils/suscripcion-fechas.util';
import { LimitesService } from '../../infrastructure/limits/limites.service';
import { EmailService } from '../../infrastructure/email/email.service';

/** DTO interno con facturaId añadido por el controller. */
export type RegistrarPagoFacturaDtoConId = RegistrarPagoFacturaDto & {
  facturaId: string;
};

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
    private readonly limites: LimitesService,
    private readonly email: EmailService,
  ) {}

  /** Lista facturas de una junta. */
  async listarFacturas(
    juntaId: string,
    page = 1,
    limit = 20,
    estado?: EstadoFactura,
  ) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
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
          suscripcion: {
            select: { id: true, plan: { select: { nombre: true } } },
          },
          creadoPor: { select: { nombres: true, apellidos: true } },
          pagos: {
            select: { id: true, monto: true, fecha: true, metodo: true },
          },
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
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
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
        suscripcion: {
          select: { id: true, plan: { select: { nombre: true } } },
        },
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
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
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
        metadata: (dto.metadata ?? undefined) as
          | Prisma.InputJsonValue
          | undefined,
        creadoPorId: ejecutadoPorId,
      },
      include: {
        suscripcion: {
          select: { id: true, plan: { select: { nombre: true } } },
        },
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

    if (junta.email) {
      void this.email.enviarFacturaPendiente({
        juntaNombre: junta.nombre,
        juntaEmail: junta.email,
        monto: factura.monto,
        fechaVencimiento: factura.fechaVencimiento,
        tipo: factura.tipo,
      });
    }

    return { data: factura };
  }

  /** Historial de pagos de facturas (pagos al proveedor) de una junta. */
  async listarPagosPlataforma(juntaId: string, page = 1, limit = 20) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
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
        ? process.env.WOMPI_REDIRECT_URL.replace(
            '/pagos/retorno',
            '/facturas-plataforma/retorno',
          )
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
   * Crea factura + intención de pago para suscripción sin trial.
   * Al confirmar pago (webhook/retorno) se crea la Suscripción.
   * PIVOT_FACTURACION_SAAS.md
   */
  async crearIntencionPagoSuscripcion(
    juntaId: string,
    planId: string,
    periodo: 'mensual' | 'anual',
    diasPrueba: number,
    iniciadoPorId: string,
  ): Promise<{ checkoutUrl: string; referencia: string; facturaId: string }> {
    const existente = await this.prisma.suscripcion.findUnique({
      where: { juntaId },
      include: { plan: true },
    });
    if (
      existente &&
      (existente.estado === EstadoSuscripcion.ACTIVA ||
        existente.estado === EstadoSuscripcion.PRUEBA)
    ) {
      throw new BadRequestException('La junta ya tiene una suscripción activa');
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.activo)
      throw new BadRequestException('El plan no está disponible');

    const monto = periodo === 'mensual' ? plan.precioMensual : plan.precioAnual;
    if (monto <= 0) {
      throw new BadRequestException(
        'El plan no tiene precio configurado para el periodo elegido',
      );
    }

    const fechaInicio = new Date();
    const fechaVencimiento = new Date(fechaInicio);
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

    const factura = await this.prisma.factura.create({
      data: {
        juntaId,
        suscripcionId: null,
        monto,
        fechaVencimiento,
        estado: EstadoFactura.PENDIENTE,
        tipo: TipoFactura.SUSCRIPCION,
        metadata: {
          planId,
          periodo,
          diasPrueba,
          juntaId,
        } as Prisma.InputJsonValue,
        creadoPorId: iniciadoPorId,
      },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Factura',
      entidadId: factura.id,
      accion: 'INTENCION_SUSCRIPCION_CREADA',
      metadata: { planId, planNombre: plan.nombre, periodo, monto },
      ejecutadoPorId: iniciadoPorId,
    });

    const montoCents = monto * 100;
    const referencia = `SUS-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const baseRedirect =
      process.env.WOMPI_REDIRECT_URL_FACTURAS ||
      (process.env.WOMPI_REDIRECT_URL
        ? process.env.WOMPI_REDIRECT_URL.replace(
            '/pagos/retorno',
            '/facturas-plataforma/retorno',
          )
        : 'http://localhost:4200/facturas-plataforma/retorno');
    const redirectUrl = `${baseRedirect}?factura_id=${factura.id}`;

    const link = await this.wompi.crearPaymentLink(
      {
        name: `Suscripción ${plan.nombre} - ${referencia}`,
        description: `Pago de suscripción a la plataforma - ${plan.nombre}`,
        amountInCents: montoCents,
        currency: 'COP',
        singleUse: true,
        redirectUrl,
        sku: referencia,
      },
      undefined,
    );

    await this.prisma.intencionPagoFactura.create({
      data: {
        facturaId: factura.id,
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

    return { checkoutUrl, referencia, facturaId: factura.id };
  }

  /**
   * Crea factura + intención para overrides (aumento de capacidad).
   * Al confirmar pago se aplican los overrides en la Suscripción.
   * PIVOT_FACTURACION_SAAS.md
   */
  async crearIntencionPagoOverrides(
    juntaId: string,
    params: {
      suscripcionId: string;
      overrideLimiteUsuarios?: number | null;
      overrideLimiteStorageMb?: number | null;
      overrideLimiteCartasMes?: number | null;
      motivoPersonalizacion?: string | null;
    },
    iniciadoPorId: string,
  ): Promise<{ checkoutUrl: string; referencia: string; facturaId: string }> {
    const suscripcion = await this.prisma.suscripcion.findFirst({
      where: { id: params.suscripcionId, juntaId },
      include: { plan: true },
    });
    if (!suscripcion) throw new NotFoundException('Suscripción no encontrada');
    if (!suscripcion.plan.esPersonalizable) {
      throw new BadRequestException('El plan no permite overrides');
    }

    const tieneOverrides =
      params.overrideLimiteUsuarios != null ||
      params.overrideLimiteStorageMb != null ||
      params.overrideLimiteCartasMes != null;
    if (!tieneOverrides) {
      throw new BadRequestException(
        'Debe indicar al menos un límite a aumentar',
      );
    }

    const monto = this.calcularMontoOverrides(suscripcion, params);
    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

    const factura = await this.prisma.factura.create({
      data: {
        juntaId,
        suscripcionId: params.suscripcionId,
        monto,
        fechaVencimiento,
        estado: EstadoFactura.PENDIENTE,
        tipo: TipoFactura.OVERRIDE,
        metadata: {
          overrideLimiteUsuarios: params.overrideLimiteUsuarios ?? null,
          overrideLimiteStorageMb: params.overrideLimiteStorageMb ?? null,
          overrideLimiteCartasMes: params.overrideLimiteCartasMes ?? null,
          motivoPersonalizacion: params.motivoPersonalizacion ?? null,
          suscripcionId: params.suscripcionId,
        } as Prisma.InputJsonValue,
        creadoPorId: iniciadoPorId,
      },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Factura',
      entidadId: factura.id,
      accion: 'INTENCION_OVERRIDES_CREADA',
      metadata: { suscripcionId: params.suscripcionId, monto },
      ejecutadoPorId: iniciadoPorId,
    });

    const montoCents = monto * 100;
    const referencia = `OVR-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const baseRedirect =
      process.env.WOMPI_REDIRECT_URL_FACTURAS ||
      (process.env.WOMPI_REDIRECT_URL
        ? process.env.WOMPI_REDIRECT_URL.replace(
            '/pagos/retorno',
            '/facturas-plataforma/retorno',
          )
        : 'http://localhost:4200/facturas-plataforma/retorno');
    const redirectUrl = `${baseRedirect}?factura_id=${factura.id}`;

    const link = await this.wompi.crearPaymentLink(
      {
        name: `Overrides ${suscripcion.plan.nombre} - ${referencia}`,
        description: 'Pago por aumento de capacidad',
        amountInCents: montoCents,
        currency: 'COP',
        singleUse: true,
        redirectUrl,
        sku: referencia,
      },
      undefined,
    );

    await this.prisma.intencionPagoFactura.create({
      data: {
        facturaId: factura.id,
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

    return { checkoutUrl, referencia, facturaId: factura.id };
  }

  /**
   * Crea factura + intención para upgrade (cambio a plan superior).
   * Al confirmar pago se actualiza la Suscripción.
   * PIVOT_FACTURACION_SAAS.md
   */
  async crearIntencionPagoUpgrade(
    juntaId: string,
    suscripcionId: string,
    planId: string,
    periodo: 'mensual' | 'anual',
    iniciadoPorId: string,
  ): Promise<{ checkoutUrl: string; referencia: string; facturaId: string }> {
    const suscripcion = await this.prisma.suscripcion.findFirst({
      where: { id: suscripcionId, juntaId },
      include: { plan: true },
    });
    if (!suscripcion) throw new NotFoundException('Suscripción no encontrada');

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');
    if (!plan.activo)
      throw new BadRequestException('El plan no está disponible');
    if (plan.precioMensual < suscripcion.plan.precioMensual) {
      throw new BadRequestException(
        'Solo se permite upgrade a plan superior. Use cambiar plan para downgrade.',
      );
    }

    const monto = periodo === 'mensual' ? plan.precioMensual : plan.precioAnual;
    if (monto <= 0) {
      throw new BadRequestException(
        'El plan no tiene precio configurado para el periodo elegido',
      );
    }

    const fechaVencimiento = new Date();
    fechaVencimiento.setDate(fechaVencimiento.getDate() + 7);

    const factura = await this.prisma.factura.create({
      data: {
        juntaId,
        suscripcionId,
        monto,
        fechaVencimiento,
        estado: EstadoFactura.PENDIENTE,
        tipo: TipoFactura.UPGRADE,
        metadata: { planId, periodo } as Prisma.InputJsonValue,
        creadoPorId: iniciadoPorId,
      },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Factura',
      entidadId: factura.id,
      accion: 'INTENCION_UPGRADE_CREADA',
      metadata: { planId, planNombre: plan.nombre, periodo, monto },
      ejecutadoPorId: iniciadoPorId,
    });

    const montoCents = monto * 100;
    const referencia = `UPG-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const baseRedirect =
      process.env.WOMPI_REDIRECT_URL_FACTURAS ||
      (process.env.WOMPI_REDIRECT_URL
        ? process.env.WOMPI_REDIRECT_URL.replace(
            '/pagos/retorno',
            '/facturas-plataforma/retorno',
          )
        : 'http://localhost:4200/facturas-plataforma/retorno');
    const redirectUrl = `${baseRedirect}?factura_id=${factura.id}`;

    const link = await this.wompi.crearPaymentLink(
      {
        name: `Upgrade a ${plan.nombre} - ${referencia}`,
        description: `Cambio de plan a ${plan.nombre}`,
        amountInCents: montoCents,
        currency: 'COP',
        singleUse: true,
        redirectUrl,
        sku: referencia,
      },
      undefined,
    );

    await this.prisma.intencionPagoFactura.create({
      data: {
        facturaId: factura.id,
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

    return { checkoutUrl, referencia, facturaId: factura.id };
  }

  /**
   * Calcula monto por overrides: cobra solo el INCREMENTO sobre el límite actual.
   * Ej: plan 10 usuarios, override 15, precio 5.000 → (15-10)*5.000 = 25.000 COP.
   */
  private calcularMontoOverrides(
    suscripcion: {
      overrideLimiteUsuarios: number | null;
      overrideLimiteStorageMb: number | null;
      overrideLimiteCartasMes: number | null;
      plan: {
        limiteUsuarios: number | null;
        limiteStorageMb: number | null;
        limiteCartasMes: number | null;
        permiteUsuariosIlimitados: boolean;
        permiteStorageIlimitado: boolean;
        permiteCartasIlimitadas: boolean;
        precioPorUsuarioAdicional: number | null;
        precioPorMbAdicional: number | null;
        precioPorCartaAdicional: number | null;
      };
    },
    params: {
      overrideLimiteUsuarios?: number | null;
      overrideLimiteStorageMb?: number | null;
      overrideLimiteCartasMes?: number | null;
    },
  ): number {
    const { plan } = suscripcion;

    const limiteBaseUsuarios = plan.permiteUsuariosIlimitados
      ? Infinity
      : (suscripcion.overrideLimiteUsuarios ?? plan.limiteUsuarios ?? 0);
    const limiteBaseStorage = plan.permiteStorageIlimitado
      ? Infinity
      : (suscripcion.overrideLimiteStorageMb ?? plan.limiteStorageMb ?? 0);
    const limiteBaseCartas = plan.permiteCartasIlimitadas
      ? Infinity
      : (suscripcion.overrideLimiteCartasMes ?? plan.limiteCartasMes ?? 0);

    let total = 0;
    if (
      params.overrideLimiteUsuarios != null &&
      plan.precioPorUsuarioAdicional != null &&
      limiteBaseUsuarios !== Infinity
    ) {
      const delta = Math.max(
        0,
        params.overrideLimiteUsuarios - limiteBaseUsuarios,
      );
      total += delta * plan.precioPorUsuarioAdicional;
    }
    if (
      params.overrideLimiteStorageMb != null &&
      plan.precioPorMbAdicional != null &&
      limiteBaseStorage !== Infinity
    ) {
      const delta = Math.max(
        0,
        params.overrideLimiteStorageMb - limiteBaseStorage,
      );
      total += delta * plan.precioPorMbAdicional;
    }
    if (
      params.overrideLimiteCartasMes != null &&
      plan.precioPorCartaAdicional != null &&
      limiteBaseCartas !== Infinity
    ) {
      const delta = Math.max(
        0,
        params.overrideLimiteCartasMes - limiteBaseCartas,
      );
      total += delta * plan.precioPorCartaAdicional;
    }

    if (total <= 0) {
      throw new BadRequestException(
        'No hay incremento de capacidad que facturar. Verifique que los nuevos límites sean mayores a los actuales y que el plan tenga precios por demanda configurados.',
      );
    }
    return total;
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
      throw new BadRequestException(
        'Intención de pago no encontrada o monto no coincide',
      );
    }

    const factura = intencion.factura;
    const existePago = factura.pagos.some(
      (p) => p.referenciaExterna === transactionId,
    );
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

    if (
      factura.tipo === TipoFactura.SUSCRIPCION &&
      factura.suscripcionId === null
    ) {
      const meta = factura.metadata as {
        planId?: string;
        periodo?: 'mensual' | 'anual';
        diasPrueba?: number;
        juntaId?: string;
      } | null;
      const planId = meta?.planId;
      const juntaId = meta?.juntaId ?? intencion.juntaId;
      if (planId) {
        const periodo = meta?.periodo ?? 'anual';
        const diasPrueba = meta?.diasPrueba ?? 0;
        const fechaInicio = new Date();
        const fechaVencimiento = calcularFechaVencimiento({
          fechaInicio,
          diasPrueba,
          periodo,
        });
        const estado = getEstadoSuscripcion(diasPrueba) as EstadoSuscripcion;

        const suscripcion = await this.prisma.suscripcion.create({
          data: {
            juntaId,
            planId,
            fechaInicio,
            fechaVencimiento,
            periodo,
            estado,
          },
        });

        await this.prisma.factura.update({
          where: { id: factura.id },
          data: { suscripcionId: suscripcion.id },
        });

        await this.audit.registerEvent({
          juntaId,
          entidad: 'Suscripcion',
          entidadId: suscripcion.id,
          accion: 'CREACION_SUSCRIPCION',
          metadata: {
            planId,
            periodo,
            diasPrueba,
            origen: 'pago-suscripcion',
            facturaId: factura.id,
          },
          ejecutadoPorId: intencion.iniciadoPorId,
        });
      }
    } else if (
      factura.tipo === TipoFactura.SUSCRIPCION &&
      factura.suscripcionId !== null
    ) {
      const meta = factura.metadata as { periodo?: 'mensual' | 'anual' } | null;
      const periodo = meta?.periodo ?? 'anual';
      const fechaInicio = new Date();
      const fechaVencimiento = calcularFechaVencimiento({
        fechaInicio,
        diasPrueba: 0,
        periodo,
      });
      await this.prisma.suscripcion.update({
        where: { id: factura.suscripcionId },
        data: {
          estado: EstadoSuscripcion.ACTIVA,
          fechaVencimiento,
          periodo,
        },
      });
      await this.audit.registerEvent({
        juntaId: intencion.juntaId,
        entidad: 'Suscripcion',
        entidadId: factura.suscripcionId,
        accion: 'TRIAL_CONVERTIDO_ACTIVA',
        metadata: { periodo, facturaId: factura.id },
        ejecutadoPorId: intencion.iniciadoPorId,
      });
    } else if (factura.tipo === TipoFactura.OVERRIDE && factura.suscripcionId) {
      const meta = factura.metadata as {
        overrideLimiteUsuarios?: number | null;
        overrideLimiteStorageMb?: number | null;
        overrideLimiteCartasMes?: number | null;
        motivoPersonalizacion?: string | null;
      } | null;
      if (meta) {
        const updateData: Record<string, unknown> = {
          esPlanPersonalizado: true,
        };
        if (meta.overrideLimiteUsuarios !== undefined)
          updateData.overrideLimiteUsuarios = meta.overrideLimiteUsuarios;
        if (meta.overrideLimiteStorageMb !== undefined)
          updateData.overrideLimiteStorageMb = meta.overrideLimiteStorageMb;
        if (meta.overrideLimiteCartasMes !== undefined)
          updateData.overrideLimiteCartasMes = meta.overrideLimiteCartasMes;
        if (meta.motivoPersonalizacion !== undefined)
          updateData.motivoPersonalizacion = meta.motivoPersonalizacion;
        await this.prisma.suscripcion.update({
          where: { id: factura.suscripcionId },
          data: updateData,
        });
        await this.audit.registerEvent({
          juntaId: intencion.juntaId,
          entidad: 'Suscripcion',
          entidadId: factura.suscripcionId,
          accion: 'OVERRIDES_APLICADOS',
          metadata: { facturaId: factura.id, ...meta },
          ejecutadoPorId: intencion.iniciadoPorId,
        });
      }
    } else if (factura.tipo === TipoFactura.UPGRADE && factura.suscripcionId) {
      const meta = factura.metadata as {
        planId?: string;
        periodo?: 'mensual' | 'anual';
      } | null;
      const planId = meta?.planId;
      if (planId) {
        const periodo = meta?.periodo ?? 'anual';
        const fechaInicio = new Date();
        const fechaVencimiento = calcularFechaVencimiento({
          fechaInicio,
          diasPrueba: 0,
          periodo,
        });
        await this.prisma.suscripcion.update({
          where: { id: factura.suscripcionId },
          data: {
            planId,
            fechaVencimiento,
            periodo,
            overrideLimiteUsuarios: null,
            overrideLimiteStorageMb: null,
            overrideLimiteCartasMes: null,
            esPlanPersonalizado: false,
          },
        });
        await this.audit.registerEvent({
          juntaId: intencion.juntaId,
          entidad: 'Suscripcion',
          entidadId: factura.suscripcionId,
          accion: 'UPGRADE_APLICADO',
          metadata: { planId, periodo, facturaId: factura.id },
          ejecutadoPorId: intencion.iniciadoPorId,
        });
      }
    } else if (
      factura.tipo === TipoFactura.RENOVACION &&
      factura.suscripcionId
    ) {
      const suscripcion = await this.prisma.suscripcion.findUnique({
        where: { id: factura.suscripcionId },
        include: { plan: true },
      });
      if (suscripcion) {
        const meta = factura.metadata as {
          periodo?: 'mensual' | 'anual';
        } | null;
        const periodo: 'mensual' | 'anual' =
          meta?.periodo ??
          (suscripcion.periodo === 'mensual' || suscripcion.periodo === 'anual'
            ? suscripcion.periodo
            : 'anual');
        const fechaInicio = new Date(
          Math.max(
            new Date(suscripcion.fechaVencimiento).getTime(),
            Date.now(),
          ),
        );
        const fechaVencimiento = calcularFechaVencimiento({
          fechaInicio,
          diasPrueba: 0,
          periodo,
        });
        await this.prisma.suscripcion.update({
          where: { id: factura.suscripcionId },
          data: {
            estado: EstadoSuscripcion.ACTIVA,
            fechaVencimiento,
            periodo,
          },
        });
        await this.audit.registerEvent({
          juntaId: intencion.juntaId,
          entidad: 'Suscripcion',
          entidadId: factura.suscripcionId,
          accion: 'RENOVACION_APLICADA',
          metadata: { periodo, facturaId: factura.id },
          ejecutadoPorId: intencion.iniciadoPorId,
        });
      }
    }

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
      return {
        registrado: false,
        codigo: 'FACTURA_NO_ENCONTRADA',
        mensaje: 'Factura no encontrada',
      };
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
      mensaje: yaRegistrado
        ? 'El pago ya estaba registrado'
        : 'Pago registrado correctamente',
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
      include: {
        pagos: true,
        junta: { select: { nombre: true, email: true } },
      },
    });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    if (factura.estado === EstadoFactura.PAGADA) {
      throw new BadRequestException('La factura ya está pagada');
    }
    if (factura.estado === EstadoFactura.CANCELADA) {
      throw new BadRequestException(
        'No se pueden registrar pagos en facturas canceladas',
      );
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
      nuevoTotal >= factura.monto
        ? EstadoFactura.PAGADA
        : EstadoFactura.PARCIAL;

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
        suscripcion: {
          select: { id: true, plan: { select: { nombre: true } } },
        },
      },
    });

    if (nuevoEstado === EstadoFactura.PAGADA && factura.junta?.email) {
      void this.email.enviarPagoConfirmado({
        juntaNombre: factura.junta.nombre,
        juntaEmail: factura.junta.email,
        monto: dto.monto,
        fecha: pago.fecha ?? new Date(),
      });
    }

    return { data: { pago, factura: facturaActualizada } };
  }

  /** Cancela una factura (solo PENDIENTE o VENCIDA). */
  async cancelarFactura(
    juntaId: string,
    facturaId: string,
    ejecutadoPorId: string,
  ) {
    const factura = await this.prisma.factura.findFirst({
      where: { id: facturaId, juntaId },
      include: { pagos: true },
    });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    if (factura.estado === EstadoFactura.PAGADA) {
      throw new BadRequestException(
        'No se puede cancelar una factura ya pagada',
      );
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
        suscripcion: {
          select: { id: true, plan: { select: { nombre: true } } },
        },
      },
    });

    return { data: actualizada };
  }

  /** Reactiva una factura cancelada (solo si no tiene pagos y está en vigencia). */
  async reactivarFactura(
    juntaId: string,
    facturaId: string,
    ejecutadoPorId: string,
  ) {
    const factura = await this.prisma.factura.findFirst({
      where: { id: facturaId, juntaId },
      include: { pagos: true },
    });
    if (!factura) throw new NotFoundException('Factura no encontrada');

    if (factura.estado !== EstadoFactura.CANCELADA) {
      throw new BadRequestException(
        'Solo se pueden reactivar facturas canceladas',
      );
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
        suscripcion: {
          select: { id: true, plan: { select: { nombre: true } } },
        },
      },
    });

    return { data: actualizada };
  }

  /**
   * Genera facturas de renovación cuando la suscripción está por vencer o ya venció.
   * Solo para suscripciones ACTIVA/PRUEBA. Tipo RENOVACION.
   * PIVOT_FACTURACION_SAAS.md
   */
  async generarFacturasRenovacion(ejecutadoPorId: string): Promise<{
    generadas: number;
    omitidas: number;
    errores: string[];
  }> {
    const ahora = new Date();
    const enSieteDias = new Date(ahora);
    enSieteDias.setDate(enSieteDias.getDate() + 7);

    const suscripciones = await this.prisma.suscripcion.findMany({
      where: {
        estado: { in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.PRUEBA] },
        fechaVencimiento: { lte: enSieteDias },
        cancelacionSolicitada: false, // No renovar suscripciones cuya cancelación fue solicitada
      },
      include: {
        plan: true,
        junta: { select: { id: true, nombre: true, email: true } },
      },
    });

    let generadas = 0;
    let omitidas = 0;
    const errores: string[] = [];

    for (const susc of suscripciones) {
      const yaFacturada = await this.prisma.factura.findFirst({
        where: {
          suscripcionId: susc.id,
          tipo: TipoFactura.RENOVACION,
          estado: {
            in: [
              EstadoFactura.PENDIENTE,
              EstadoFactura.VENCIDA,
              EstadoFactura.PARCIAL,
            ],
          },
        },
      });

      if (yaFacturada) {
        omitidas++;
        continue;
      }

      try {
        const periodo =
          susc.periodo === 'mensual' || susc.periodo === 'anual'
            ? susc.periodo
            : this.inferirPeriodo(susc.fechaInicio, susc.fechaVencimiento);
        const monto =
          susc.precioPersonalizado != null
            ? Number(susc.precioPersonalizado)
            : periodo === 'mensual'
              ? susc.plan.precioMensual
              : susc.plan.precioAnual;

        const fechaVencimientoFactura = new Date(susc.fechaVencimiento);
        fechaVencimientoFactura.setDate(fechaVencimientoFactura.getDate() + 7);

        const factura = await this.prisma.factura.create({
          data: {
            juntaId: susc.juntaId,
            suscripcionId: susc.id,
            monto,
            fechaVencimiento: fechaVencimientoFactura,
            estado: EstadoFactura.PENDIENTE,
            tipo: TipoFactura.RENOVACION,
            metadata: { periodo, planNombre: susc.plan.nombre },
          },
        });

        await this.audit.registerEvent({
          juntaId: susc.juntaId,
          entidad: 'Factura',
          entidadId: factura.id,
          accion: 'FACTURA_RENOVACION_GENERADA',
          metadata: {
            suscripcionId: susc.id,
            planNombre: susc.plan.nombre,
            monto,
            periodo,
          },
          ejecutadoPorId,
        });

        if (susc.junta.email) {
          void this.email.enviarFacturaPendiente({
            juntaNombre: susc.junta.nombre,
            juntaEmail: susc.junta.email,
            monto,
            fechaVencimiento: fechaVencimientoFactura,
            tipo: TipoFactura.RENOVACION,
          });
        }

        generadas++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errores.push(`${susc.junta.nombre}: ${msg}`);
      }

      // Micro-pausa: permite que el event-loop respire entre juntas.
      // Evita pico de CPU/conexiones cuando hay muchas suscripciones por renovar.
      await this.sleep(150);
    }

    return { generadas, omitidas, errores };
  }

  private inferirPeriodo(
    fechaInicio: Date,
    fechaVencimiento: Date,
  ): 'mensual' | 'anual' {
    const diffMs =
      new Date(fechaVencimiento).getTime() - new Date(fechaInicio).getTime();
    const diffDias = diffMs / (1000 * 60 * 60 * 24);
    return diffDias > 180 ? 'anual' : 'mensual';
  }

  /** @deprecated Use generarFacturasRenovacion. Mantiene compatibilidad con cron existente. */
  async generarFacturasMensuales(ejecutadoPorId: string): Promise<{
    generadas: number;
    omitidas: number;
    errores: string[];
  }> {
    return this.generarFacturasRenovacion(ejecutadoPorId);
  }

  /**
   * Genera facturas OVERRIDE mensuales por exceso de consumo.
   * Ejecutar el día 1 de cada mes para facturar el mes anterior.
   * MODELO_OVERRIDES_CONSUMO.md
   */
  async generarFacturasOverridesMensuales(
    mesAno: { year: number; month: number },
    ejecutadoPorId: string,
  ): Promise<{ generadas: number; omitidas: number; errores: string[] }> {
    const { year, month } = mesAno;
    const mesOverride = `${year}-${String(month).padStart(2, '0')}`;

    const suscripciones = await this.prisma.suscripcion.findMany({
      where: {
        estado: { in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.PRUEBA] },
        plan: { esPersonalizable: true },
      },
      include: { plan: true, junta: { select: { id: true, nombre: true } } },
    });

    let generadas = 0;
    let omitidas = 0;
    const errores: string[] = [];

    for (const susc of suscripciones) {
      const yaFacturada = await this.prisma.factura.findFirst({
        where: {
          juntaId: susc.juntaId,
          tipo: TipoFactura.OVERRIDE,
          metadata: { path: ['mesOverride'], equals: mesOverride },
        },
      });

      if (yaFacturada) {
        omitidas++;
        continue;
      }

      try {
        const limites = await this.limites.getLimitesEfectivos(susc.juntaId);
        if (!limites) continue;

        const uso = await this.limites.getUsoParaMes(susc.juntaId, year, month);
        const { plan } = susc;

        let monto = 0;
        const detalle: Record<string, number> = {};

        if (
          limites.limiteUsuarios !== Infinity &&
          plan.precioPorUsuarioAdicional != null &&
          uso.usuarios > limites.limiteUsuarios
        ) {
          const exceso = uso.usuarios - limites.limiteUsuarios;
          const cobro = exceso * plan.precioPorUsuarioAdicional;
          monto += cobro;
          detalle.usuarios = cobro;
        }
        if (
          limites.limiteStorageMb !== Infinity &&
          plan.precioPorMbAdicional != null &&
          uso.storageMb > limites.limiteStorageMb
        ) {
          const exceso = Math.ceil(uso.storageMb - limites.limiteStorageMb);
          const cobro = exceso * plan.precioPorMbAdicional;
          monto += cobro;
          detalle.storageMb = cobro;
        }
        if (
          limites.limiteCartasMes !== Infinity &&
          plan.precioPorCartaAdicional != null &&
          uso.cartasEnMes > limites.limiteCartasMes
        ) {
          const exceso = uso.cartasEnMes - limites.limiteCartasMes;
          const cobro = exceso * plan.precioPorCartaAdicional;
          monto += cobro;
          detalle.cartas = cobro;
        }

        if (monto <= 0) {
          omitidas++;
          continue;
        }

        const fechaVencimiento = new Date();
        fechaVencimiento.setDate(fechaVencimiento.getDate() + 30);

        const factura = await this.prisma.factura.create({
          data: {
            juntaId: susc.juntaId,
            suscripcionId: susc.id,
            monto,
            fechaVencimiento,
            estado: EstadoFactura.PENDIENTE,
            tipo: TipoFactura.OVERRIDE,
            metadata: {
              mesOverride,
              detalle,
              origen: 'cron_mensual',
            } as Prisma.InputJsonValue,
            creadoPorId: ejecutadoPorId,
          },
        });

        await this.audit.registerEvent({
          juntaId: susc.juntaId,
          entidad: 'Factura',
          entidadId: factura.id,
          accion: 'FACTURA_OVERRIDE_MENSUAL_GENERADA',
          metadata: { mesOverride, monto, detalle },
          ejecutadoPorId,
        });

        generadas++;
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        errores.push(`${susc.junta.nombre}: ${msg}`);
      }

      // Micro-pausa entre juntas: evita saturar CPU/BD en día 1 (el más cargado).
      await this.sleep(150);
    }

    return { generadas, omitidas, errores };
  }

  /**
   * Micro-pausa entre iteraciones de un bucle de cron.
   * Evita saturar CPU y conexiones de BD cuando se procesan muchas juntas el día 1.
   * 150ms es suficiente para que el event-loop respire sin hacer el job perceptiblemente lento.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
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
