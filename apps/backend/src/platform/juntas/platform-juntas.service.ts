import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { normalizarTelefonoColombia } from '../../common/utils/validacion-telefono.util';
import { PrismaService } from '../../prisma/prisma.service';
import {
  JuntaService,
  CreateJuntaAdminUser,
  CreateJuntaResult,
} from '../../application/junta/junta.service';
import { AuditService } from '../../domain/services/audit.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import {
  RolNombre,
  EstadoSuscripcion,
  EstadoFactura,
  TipoFactura,
} from '@prisma/client';
import { LimitesService } from '../../infrastructure/limits/limites.service';
import {
  calcularFechaVencimiento,
  getEstadoSuscripcion,
} from '../../common/utils/suscripcion-fechas.util';

function generarPasswordTemporal(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

export interface CreateJuntaPlatformDto {
  nombre: string;
  email: string;
  telefono: string;
  nit?: string;
  montoCarta?: number;
  adminUser: CreateJuntaAdminUser;
  planId?: string;
  diasPrueba?: number;
  /** Requerido: aceptación de términos de servicio (Ley 527). */
  aceptoTerminos: boolean;
}

/**
 * Servicio de juntas para Platform Admin.
 * Responsabilidad: CRUD juntas, ciclo de vida (activo/baja).
 * Dependencias: JuntaService (crear), AuditService, Prisma.
 */
@Injectable()
export class PlatformJuntasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly juntaService: JuntaService,
    private readonly audit: AuditService,
    private readonly limites: LimitesService,
    private readonly encryption: EncryptionService,
  ) {}

  async listar(page = 1, limit = 20, activo?: boolean) {
    const skip = (page - 1) * limit;
    const where = activo !== undefined ? { activo } : {};
    const [juntas, total] = await Promise.all([
      this.prisma.junta.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fechaCreacion: 'desc' },
        select: {
          id: true,
          nombre: true,
          nit: true,
          montoCarta: true,
          fechaCreacion: true,
          activo: true,
          fechaBaja: true,
          telefono: true,
          email: true,
          direccion: true,
          ciudad: true,
          departamento: true,
          enMantenimiento: true,
          _count: { select: { usuarios: true, pagos: true } },
        },
      }),
      this.prisma.junta.count({ where }),
    ]);

    return {
      data: juntas,
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async obtener(id: string) {
    const junta = await this.prisma.junta.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        nit: true,
        montoCarta: true,
        fechaCreacion: true,
        activo: true,
        fechaBaja: true,
        telefono: true,
        email: true,
        direccion: true,
        ciudad: true,
        departamento: true,
        personeriaJuridica: true,
        membreteUrl: true,
        enMantenimiento: true,
        wompiPrivateKey: true,
        _count: { select: { usuarios: true, pagos: true, cartas: true } },
        suscripcion: {
          select: {
            id: true,
            estado: true,
            fechaInicio: true,
            fechaVencimiento: true,
            periodo: true,
            planIdPendiente: true,
            esPlanPersonalizado: true,
            overrideLimiteUsuarios: true,
            overrideLimiteStorageMb: true,
            overrideLimiteCartasMes: true,
            motivoPersonalizacion: true,
            plan: {
              select: {
                id: true,
                nombre: true,
                precioMensual: true,
                precioAnual: true,
                limiteUsuarios: true,
                limiteStorageMb: true,
                limiteCartasMes: true,
                esPersonalizable: true,
                permiteUsuariosIlimitados: true,
                permiteStorageIlimitado: true,
                permiteCartasIlimitadas: true,
              },
            },
          },
        },
      },
    });

    if (!junta) {
      throw new NotFoundException('Junta no encontrada');
    }

    const admin = await this.obtenerAdminDeJunta(id);
    const adminInfo = admin
      ? {
          id: admin.id,
          nombres: admin.nombres,
          apellidos: admin.apellidos,
          numeroDocumento: admin.numeroDocumento,
          activo: admin.activo,
        }
      : null;

    const wompiConfigurado = !!junta.wompiPrivateKey;
    const { wompiPrivateKey: _omitted, ...rest } = junta;

    return {
      data: {
        ...rest,
        admin: adminInfo,
        wompiConfigurado,
      },
    };
  }

  /**
   * Actualiza credenciales Wompi de la junta.
   * String vacío = borrar (null). Credenciales se encriptan antes de guardar.
   * WOMPI_POR_JUNTA_DOC §3.1
   */
  async actualizarWompi(
    juntaId: string,
    dto: {
      wompiPrivateKey?: string | null;
      wompiPublicKey?: string | null;
      wompiIntegritySecret?: string | null;
      wompiEventsSecret?: string | null;
      wompiEnvironment?: string | null;
    },
    ejecutadoPorId: string,
  ) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const data: Record<string, unknown> = {};

    const enc = (v: string | null | undefined): string | null => {
      if (v === undefined) return undefined as unknown as string | null;
      if (v === null || v.trim() === '') return null;
      return this.encryption.encrypt(v.trim());
    };

    if (dto.wompiPrivateKey !== undefined)
      data.wompiPrivateKey = enc(dto.wompiPrivateKey);
    if (dto.wompiPublicKey !== undefined)
      data.wompiPublicKey = enc(dto.wompiPublicKey);
    if (dto.wompiIntegritySecret !== undefined)
      data.wompiIntegritySecret = enc(dto.wompiIntegritySecret);
    if (dto.wompiEventsSecret !== undefined)
      data.wompiEventsSecret = enc(dto.wompiEventsSecret);
    if (dto.wompiEnvironment !== undefined)
      data.wompiEnvironment =
        dto.wompiEnvironment && dto.wompiEnvironment.trim()
          ? dto.wompiEnvironment.trim()
          : null;

    await this.prisma.junta.update({
      where: { id: juntaId },
      data,
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Junta',
      entidadId: juntaId,
      accion: 'CONFIG_WOMPI_JUNTA',
      metadata: {
        camposActualizados: Object.keys(data).filter((k) => !k.startsWith('_')),
      },
      ejecutadoPorId,
    });

    return { ok: true };
  }

  /** Lista usuarios de la junta (para selector cambiar admin). */
  async listarUsuarios(juntaId: string) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const usuarios = await this.prisma.usuario.findMany({
      where: { juntaId },
      select: {
        id: true,
        nombres: true,
        apellidos: true,
        numeroDocumento: true,
        activo: true,
        roles: { include: { rol: { select: { nombre: true } } } },
      },
      orderBy: [{ apellidos: 'asc' }, { nombres: 'asc' }],
    });

    return {
      data: usuarios.map((u) => ({
        id: u.id,
        nombres: u.nombres,
        apellidos: u.apellidos,
        numeroDocumento: u.numeroDocumento,
        activo: u.activo,
        esAdmin: u.roles.some((r) => r.rol.nombre === RolNombre.ADMIN),
      })),
    };
  }

  /** Resumen de la junta: usuarios, pagos recientes, cartas emitidas. */
  async resumen(juntaId: string) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const [counts, pagosRecientes, cartasRecientes] = await Promise.all([
      this.prisma.junta.findUniqueOrThrow({
        where: { id: juntaId },
        select: {
          _count: { select: { usuarios: true, pagos: true, cartas: true } },
        },
      }),
      this.prisma.pago.findMany({
        where: { juntaId },
        take: 5,
        orderBy: { fechaPago: 'desc' },
        select: {
          id: true,
          monto: true,
          tipo: true,
          fechaPago: true,
          usuario: { select: { nombres: true, apellidos: true } },
        },
      }),
      this.prisma.carta.findMany({
        where: { juntaId, estado: 'APROBADA' },
        take: 5,
        orderBy: { fechaEmision: 'desc' },
        select: {
          id: true,
          consecutivo: true,
          anio: true,
          fechaEmision: true,
          usuario: { select: { nombres: true, apellidos: true } },
        },
      }),
    ]);

    return {
      data: {
        totalUsuarios: counts._count.usuarios,
        totalPagos: counts._count.pagos,
        totalCartas: counts._count.cartas,
        pagosRecientes,
        cartasRecientes,
      },
    };
  }

  /** Obtiene la suscripción de la junta. */
  async obtenerSuscripcion(juntaId: string) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
      select: {
        suscripcion: {
          select: {
            id: true,
            estado: true,
            fechaInicio: true,
            fechaVencimiento: true,
            plan: true,
          },
        },
      },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');
    if (!junta.suscripcion) {
      return { data: null };
    }
    return { data: junta.suscripcion };
  }

  /** Crea suscripción para junta (si no tiene). */
  async crearSuscripcion(
    juntaId: string,
    planId: string,
    diasPrueba: number | undefined,
    periodo: 'mensual' | 'anual' | undefined,
    ejecutadoPorId: string,
  ) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const existente = await this.prisma.suscripcion.findUnique({
      where: { juntaId },
    });
    if (existente) {
      throw new BadRequestException('La junta ya tiene una suscripción');
    }

    const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
    if (!plan) throw new NotFoundException('Plan no encontrado');

    const fechaInicio = new Date();
    const dias = diasPrueba ?? plan.diasPrueba ?? 0;
    const fechaVencimiento = calcularFechaVencimiento({
      fechaInicio,
      diasPrueba: dias,
      periodo: dias > 0 ? undefined : periodo,
    });
    const estado = getEstadoSuscripcion(dias) as EstadoSuscripcion;

    const periodoFactura = periodo ?? 'anual';
    const suscripcion = await this.prisma.suscripcion.create({
      data: {
        juntaId,
        planId,
        fechaInicio,
        fechaVencimiento,
        periodo: periodoFactura,
        estado,
      },
      include: { plan: true },
    });

    if (dias > 0) {
      const periodoFactura = periodo ?? 'anual';
      const monto =
        periodoFactura === 'mensual' ? plan.precioMensual : plan.precioAnual;
      await this.prisma.factura.create({
        data: {
          juntaId,
          suscripcionId: suscripcion.id,
          monto,
          fechaVencimiento: new Date(fechaVencimiento),
          estado: EstadoFactura.PENDIENTE,
          tipo: TipoFactura.SUSCRIPCION,
          metadata: { periodo: periodoFactura },
          creadoPorId: ejecutadoPorId,
        },
      });
    }

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Suscripcion',
      entidadId: suscripcion.id,
      accion: 'CREACION_SUSCRIPCION',
      metadata: { planId, planNombre: plan.nombre },
      ejecutadoPorId,
    });

    return { data: suscripcion };
  }

  /** Actualiza suscripción: cambiar plan, renovar, overrides (si plan personalizable). */
  async actualizarSuscripcion(
    juntaId: string,
    data: {
      planId?: string;
      periodo?: 'mensual' | 'anual';
      fechaVencimiento?: string;
      estado?: EstadoSuscripcion;
      overrideLimiteUsuarios?: number | null;
      overrideLimiteStorageMb?: number | null;
      overrideLimiteCartasMes?: number | null;
      motivoPersonalizacion?: string | null;
      forzarDowngrade?: boolean;
    },
    ejecutadoPorId: string,
  ) {
    const suscripcion = await this.prisma.suscripcion.findUnique({
      where: { juntaId },
      include: { plan: true },
    });
    if (!suscripcion)
      throw new NotFoundException('La junta no tiene suscripción');

    const updateData: Record<string, unknown> = {};
    if (data.planId) {
      const plan = await this.prisma.plan.findUnique({
        where: { id: data.planId },
      });
      if (!plan) throw new NotFoundException('Plan no encontrado');

      const resultado = await this.limites.validarCambioPlan(
        juntaId,
        {
          precioMensual: suscripcion.plan.precioMensual,
          id: suscripcion.plan.id,
        },
        plan,
        data.forzarDowngrade ?? false,
        data.periodo ?? 'anual',
      );
      const esDowngrade = plan.precioMensual < suscripcion.plan.precioMensual;
      const p = data.periodo ?? 'anual';

      if (esDowngrade && !(data.forzarDowngrade ?? false)) {
        // Downgrade programado: efectivo al fin del ciclo (planIdPendiente)
        updateData.planIdPendiente = data.planId;
        updateData.periodoPendiente = p;
        updateData.overrideLimiteUsuarios = null;
        updateData.overrideLimiteStorageMb = null;
        updateData.overrideLimiteCartasMes = null;
        updateData.esPlanPersonalizado = false;
      } else if (esDowngrade && (data.forzarDowngrade ?? false)) {
        // Downgrade forzado: aplicar inmediato
        updateData.planId = data.planId;
        updateData.periodo = p;
        updateData.planIdPendiente = null;
        updateData.periodoPendiente = null;
        updateData.overrideLimiteUsuarios = null;
        updateData.overrideLimiteStorageMb = null;
        updateData.overrideLimiteCartasMes = null;
        updateData.esPlanPersonalizado = false;
      } else {
        // Upgrade o mismo tier
        updateData.planId = data.planId;
        const debeActualizarFecha =
          resultado.esUpgrade || (!esDowngrade && data.periodo != null);
        if (debeActualizarFecha) {
          updateData.fechaVencimiento = calcularFechaVencimiento({
            fechaInicio: new Date(),
            diasPrueba: 0,
            periodo: p,
          });
          updateData.periodo = p;
        }
        updateData.planIdPendiente = null;
        updateData.periodoPendiente = null;
        updateData.overrideLimiteUsuarios = null;
        updateData.overrideLimiteStorageMb = null;
        updateData.overrideLimiteCartasMes = null;
        updateData.esPlanPersonalizado = false;
      }
    }
    if (data.fechaVencimiento && !updateData.fechaVencimiento) {
      updateData.fechaVencimiento = new Date(data.fechaVencimiento);
    }
    if (data.estado !== undefined) {
      updateData.estado = data.estado;
    }

    const tieneOverrides =
      data.overrideLimiteUsuarios !== undefined ||
      data.overrideLimiteStorageMb !== undefined ||
      data.overrideLimiteCartasMes !== undefined;
    if (tieneOverrides) {
      const planId = data.planId ?? suscripcion.planId;
      const plan = await this.prisma.plan.findUnique({ where: { id: planId } });
      if (!plan?.esPersonalizable) {
        throw new BadRequestException(
          'El plan actual no permite overrides. Elija un plan personalizable para aumentar capacidades.',
        );
      }
      if (data.overrideLimiteUsuarios !== undefined)
        updateData.overrideLimiteUsuarios = data.overrideLimiteUsuarios;
      if (data.overrideLimiteStorageMb !== undefined)
        updateData.overrideLimiteStorageMb = data.overrideLimiteStorageMb;
      if (data.overrideLimiteCartasMes !== undefined)
        updateData.overrideLimiteCartasMes = data.overrideLimiteCartasMes;
      if (data.motivoPersonalizacion !== undefined)
        updateData.motivoPersonalizacion = data.motivoPersonalizacion;
      updateData.esPlanPersonalizado = true;
    }

    const actualizada = await this.prisma.suscripcion.update({
      where: { juntaId },
      data: updateData,
      include: { plan: true },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Suscripcion',
      entidadId: suscripcion.id,
      accion: 'ACTUALIZACION_SUSCRIPCION',
      metadata: data,
      ejecutadoPorId,
    });

    return { data: actualizada };
  }

  /** Alertas por límites cercanos (>80% de uso). */
  async alertas(juntaId: string) {
    const data = await this.limites.getAlertas(juntaId);
    return { data };
  }

  /**
   * PA5-4: Suscripciones con fechaVencimiento < hoy:
   * - Si planIdPendiente: aplicar downgrade (planId = planIdPendiente, nueva vigencia).
   * - Si no: marcar como VENCIDA.
   */
  async marcarSuscripcionesVencidas(): Promise<number> {
    const ahora = new Date();
    const vencidas = await this.prisma.suscripcion.findMany({
      where: {
        estado: { in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.PRUEBA] },
        fechaVencimiento: { lt: ahora },
      },
      include: { plan: true },
    });

    let count = 0;
    for (const susc of vencidas) {
      if (susc.planIdPendiente && susc.periodoPendiente) {
        const nuevaFecha = new Date(ahora);
        if (susc.periodoPendiente === 'mensual') {
          nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
        } else {
          nuevaFecha.setFullYear(nuevaFecha.getFullYear() + 1);
        }
        await this.prisma.suscripcion.update({
          where: { id: susc.id },
          data: {
            planId: susc.planIdPendiente,
            planIdPendiente: null,
            periodo: susc.periodoPendiente,
            periodoPendiente: null,
            fechaVencimiento: nuevaFecha,
            estado: EstadoSuscripcion.ACTIVA,
          },
        });
        count++;
      } else {
        await this.prisma.suscripcion.update({
          where: { id: susc.id },
          data: { estado: EstadoSuscripcion.VENCIDA },
        });
        count++;
      }
    }
    return count;
  }

  /**
   * Igual que marcarSuscripcionesVencidas pero devuelve los datos de las juntas
   * que efectivamente quedaron en estado VENCIDA (excluye las que hicieron downgrade).
   * Usado por el cron para enviar notificaciones de email.
   */
  async marcarSuscripcionesVencidasConJuntas(): Promise<
    { nombre: string; email: string | null }[]
  > {
    const ahora = new Date();
    const vencidas = await this.prisma.suscripcion.findMany({
      where: {
        estado: { in: [EstadoSuscripcion.ACTIVA, EstadoSuscripcion.PRUEBA] },
        fechaVencimiento: { lt: ahora },
      },
      include: {
        plan: true,
        junta: { select: { nombre: true, email: true } },
      },
    });

    const juntasVencidas: { nombre: string; email: string | null }[] = [];

    for (const susc of vencidas) {
      if (susc.planIdPendiente && susc.periodoPendiente) {
        const nuevaFecha = new Date(ahora);
        if (susc.periodoPendiente === 'mensual') {
          nuevaFecha.setMonth(nuevaFecha.getMonth() + 1);
        } else {
          nuevaFecha.setFullYear(nuevaFecha.getFullYear() + 1);
        }
        await this.prisma.suscripcion.update({
          where: { id: susc.id },
          data: {
            planId: susc.planIdPendiente,
            planIdPendiente: null,
            periodo: susc.periodoPendiente,
            periodoPendiente: null,
            fechaVencimiento: nuevaFecha,
            estado: EstadoSuscripcion.ACTIVA,
          },
        });
      } else {
        await this.prisma.suscripcion.update({
          where: { id: susc.id },
          data: { estado: EstadoSuscripcion.VENCIDA },
        });
        juntasVencidas.push({
          nombre: susc.junta.nombre,
          email: susc.junta.email,
        });
      }
    }

    return juntasVencidas;
  }

  /** Uso de la junta: usuarios activos, pagos/mes, cartas/mes, documentos. */
  async uso(juntaId: string) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [
      usuariosActivos,
      pagosEsteMes,
      cartasEsteMes,
      docsAgg,
      documentosCount,
    ] = await Promise.all([
      this.prisma.usuario.count({
        where: { juntaId, activo: true },
      }),
      this.prisma.pago.count({
        where: {
          juntaId,
          fechaPago: { gte: inicioMes },
        },
      }),
      this.prisma.carta.count({
        where: {
          juntaId,
          estado: 'APROBADA',
          fechaEmision: { gte: inicioMes },
        },
      }),
      this.prisma.documento.aggregate({
        where: { usuario: { juntaId } },
        _sum: { sizeBytes: true },
      }),
      this.prisma.documento.count({
        where: { usuario: { juntaId } },
      }),
    ]);

    const totalBytes = docsAgg._sum.sizeBytes ?? 0n;
    const storageMb =
      Math.round((Number(totalBytes) / 1024 / 1024) * 100) / 100;

    const limitesEfectivos = await this.limites.getLimitesEfectivos(juntaId);
    const limitesParaApi = limitesEfectivos
      ? {
          limiteUsuarios:
            limitesEfectivos.limiteUsuarios === Infinity
              ? null
              : limitesEfectivos.limiteUsuarios,
          limiteStorageMb:
            limitesEfectivos.limiteStorageMb === Infinity
              ? null
              : limitesEfectivos.limiteStorageMb,
          limiteCartasMes:
            limitesEfectivos.limiteCartasMes === Infinity
              ? null
              : limitesEfectivos.limiteCartasMes,
        }
      : null;

    return {
      data: {
        usuariosActivos,
        pagosEsteMes,
        cartasEsteMes,
        documentosCount,
        storageMb,
        mes: now.toLocaleString('es-CO', { month: 'long', year: 'numeric' }),
        limitesEfectivos: limitesParaApi,
      },
    };
  }

  async crear(
    dto: CreateJuntaPlatformDto,
    ejecutadoPorId: string,
  ): Promise<{ data: CreateJuntaResult }> {
    const passwordTemporal = generarPasswordTemporal();
    const result = await this.juntaService.createJunta({
      nombre: dto.nombre,
      email: dto.email,
      telefono: dto.telefono,
      nit: dto.nit,
      montoCarta: dto.montoCarta,
      adminUser: dto.adminUser,
      passwordTemporal,
      ejecutadoPorId,
      planId: dto.planId,
      diasPrueba: dto.diasPrueba,
      aceptoTerminos: dto.aceptoTerminos === true,
    });

    return { data: result };
  }

  async actualizar(
    id: string,
    data: {
      nombre?: string;
      nit?: string;
      montoCarta?: number;
      activo?: boolean;
      telefono?: string | null;
      email?: string | null;
      direccion?: string | null;
      ciudad?: string | null;
      departamento?: string | null;
      personeriaJuridica?: string | null;
      membreteUrl?: string | null;
      enMantenimiento?: boolean;
    },
    ejecutadoPorId: string,
  ) {
    const junta = await this.prisma.junta.findUnique({ where: { id } });
    if (!junta) {
      throw new NotFoundException('Junta no encontrada');
    }

    if (data.telefono !== undefined) {
      const telNorm = data.telefono?.trim()
        ? normalizarTelefonoColombia(data.telefono)
        : null;
      if (!telNorm) {
        throw new BadRequestException(
          'El teléfono debe ser un número colombiano válido (10 dígitos). Email y teléfono son obligatorios.',
        );
      }
    }
    if (data.email !== undefined) {
      const emailVal = data.email?.trim();
      if (!emailVal || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailVal)) {
        throw new BadRequestException(
          'El email no es válido. Email y teléfono son obligatorios.',
        );
      }
    }

    const updateData: Record<string, unknown> = {
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.nit !== undefined && { nit: data.nit }),
      ...(data.montoCarta !== undefined && { montoCarta: data.montoCarta }),
      ...(data.activo !== undefined && { activo: data.activo }),
      ...(data.activo === false && { fechaBaja: new Date() }),
      ...(data.activo === true && { fechaBaja: null }),
      ...(data.telefono !== undefined && {
        telefono: normalizarTelefonoColombia(data.telefono)!,
      }),
      ...(data.email !== undefined && {
        email: data.email!.trim().toLowerCase(),
      }),
      ...(data.direccion !== undefined && { direccion: data.direccion }),
      ...(data.ciudad !== undefined && { ciudad: data.ciudad }),
      ...(data.departamento !== undefined && {
        departamento: data.departamento,
      }),
      ...(data.personeriaJuridica !== undefined && {
        personeriaJuridica: data.personeriaJuridica,
      }),
      ...(data.membreteUrl !== undefined && { membreteUrl: data.membreteUrl }),
      ...(data.enMantenimiento !== undefined && {
        enMantenimiento: data.enMantenimiento,
      }),
    };

    const actualizada = await this.prisma.junta.update({
      where: { id },
      data: updateData,
    });

    await this.audit.registerEvent({
      juntaId: id,
      entidad: 'Junta',
      entidadId: id,
      accion: 'ACTUALIZACION_JUNTA',
      metadata: data,
      ejecutadoPorId,
    });

    return { data: actualizada };
  }

  async darBaja(id: string, ejecutadoPorId: string) {
    const junta = await this.prisma.junta.findUnique({ where: { id } });
    if (!junta) {
      throw new NotFoundException('Junta no encontrada');
    }
    if (!junta.activo) {
      throw new NotFoundException('La junta ya está dada de baja');
    }

    const actualizada = await this.prisma.junta.update({
      where: { id },
      data: { activo: false, fechaBaja: new Date() },
    });

    await this.audit.registerEvent({
      juntaId: id,
      entidad: 'Junta',
      entidadId: id,
      accion: 'BAJA_JUNTA',
      metadata: { nombre: junta.nombre },
      ejecutadoPorId,
    });

    return { data: actualizada };
  }

  /** Obtiene el usuario ADMIN de la junta (el primero si hay varios). */
  private async obtenerAdminDeJunta(juntaId: string) {
    const rolAdmin = await this.prisma.rol.findUnique({
      where: { nombre: RolNombre.ADMIN },
    });
    if (!rolAdmin) throw new NotFoundException('Rol ADMIN no encontrado');

    const admin = await this.prisma.usuario.findFirst({
      where: {
        juntaId,
        roles: { some: { rolId: rolAdmin.id } },
      },
      include: { roles: { include: { rol: true } } },
    });
    return admin;
  }

  async resetPasswordAdmin(juntaId: string, ejecutadoPorId: string) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const admin = await this.obtenerAdminDeJunta(juntaId);
    if (!admin)
      throw new NotFoundException('No hay admin asignado en esta junta');

    const passwordTemporal = generarPasswordTemporal();
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    await this.prisma.usuario.update({
      where: { id: admin.id },
      data: { passwordHash, requiereCambioPassword: true },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Usuario',
      entidadId: admin.id,
      accion: 'RESET_PASSWORD_ADMIN',
      metadata: { adminUsuarioId: admin.id },
      ejecutadoPorId,
    });

    return {
      data: {
        adminUsuario: {
          id: admin.id,
          nombres: admin.nombres,
          apellidos: admin.apellidos,
          numeroDocumento: admin.numeroDocumento,
        },
        passwordTemporal,
      },
    };
  }

  async cambiarAdmin(
    juntaId: string,
    nuevoAdminUsuarioId: string,
    ejecutadoPorId: string,
  ) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const nuevoAdmin = await this.prisma.usuario.findFirst({
      where: { id: nuevoAdminUsuarioId, juntaId },
      include: { roles: { include: { rol: true } } },
    });
    if (!nuevoAdmin) {
      throw new BadRequestException(
        'El usuario no existe o no pertenece a esta junta',
      );
    }

    const rolAdmin = await this.prisma.rol.findUniqueOrThrow({
      where: { nombre: RolNombre.ADMIN },
    });

    const adminActual = await this.obtenerAdminDeJunta(juntaId);

    await this.prisma.$transaction(async (tx) => {
      if (adminActual && adminActual.id !== nuevoAdminUsuarioId) {
        await tx.usuarioRol.deleteMany({
          where: {
            usuarioId: adminActual.id,
            rolId: rolAdmin.id,
          },
        });
      }
      await tx.usuarioRol.upsert({
        where: {
          usuarioId_rolId: {
            usuarioId: nuevoAdminUsuarioId,
            rolId: rolAdmin.id,
          },
        },
        create: { usuarioId: nuevoAdminUsuarioId, rolId: rolAdmin.id },
        update: {},
      });
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Usuario',
      entidadId: nuevoAdminUsuarioId,
      accion: 'CAMBIO_ADMIN_JUNTA',
      metadata: {
        nuevoAdminUsuarioId,
        adminAnteriorId: adminActual?.id,
      },
      ejecutadoPorId,
    });

    return {
      data: {
        adminUsuario: {
          id: nuevoAdmin.id,
          nombres: nuevoAdmin.nombres,
          apellidos: nuevoAdmin.apellidos,
          numeroDocumento: nuevoAdmin.numeroDocumento,
        },
      },
    };
  }

  async reenviarCredencialesAdmin(juntaId: string, ejecutadoPorId: string) {
    return this.resetPasswordAdmin(juntaId, ejecutadoPorId);
  }

  async bloquearAdmin(juntaId: string, ejecutadoPorId: string) {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
    });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const admin = await this.obtenerAdminDeJunta(juntaId);
    if (!admin)
      throw new NotFoundException('No hay admin asignado en esta junta');

    await this.prisma.usuario.update({
      where: { id: admin.id },
      data: { activo: false },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Usuario',
      entidadId: admin.id,
      accion: 'BLOQUEO_ADMIN_JUNTA',
      metadata: { adminUsuarioId: admin.id },
      ejecutadoPorId,
    });

    return {
      data: {
        adminUsuario: {
          id: admin.id,
          nombres: admin.nombres,
          apellidos: admin.apellidos,
          activo: false,
        },
      },
    };
  }
}
