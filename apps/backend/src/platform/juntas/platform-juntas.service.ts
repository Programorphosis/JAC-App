import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import {
  JuntaService,
  CreateJuntaAdminUser,
  CreateJuntaResult,
} from '../../application/junta/junta.service';
import { AuditService } from '../../domain/services/audit.service';
import { randomBytes } from 'crypto';
import * as bcrypt from 'bcrypt';
import { RolNombre, EstadoSuscripcion } from '@prisma/client';
import { LimitesService } from '../../infrastructure/limits/limites.service';

function generarPasswordTemporal(): string {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  const bytes = randomBytes(12);
  return Array.from(bytes)
    .map((b) => chars[b % chars.length])
    .join('');
}

export interface CreateJuntaPlatformDto {
  nombre: string;
  nit?: string;
  montoCarta?: number;
  adminUser: CreateJuntaAdminUser;
  planId?: string;
  diasPrueba?: number;
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
        enMantenimiento: true,
        _count: { select: { usuarios: true, pagos: true, cartas: true } },
        suscripcion: {
          select: {
            id: true,
            estado: true,
            fechaInicio: true,
            fechaVencimiento: true,
            plan: {
              select: {
                id: true,
                nombre: true,
                precioMensual: true,
                precioAnual: true,
                limiteUsuarios: true,
                limiteStorageMb: true,
                limiteCartasMes: true,
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

    return {
      data: {
        ...junta,
        admin: adminInfo,
      },
    };
  }

  /** Lista usuarios de la junta (para selector cambiar admin). */
  async listarUsuarios(juntaId: string) {
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
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
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
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
    ejecutadoPorId: string,
  ) {
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
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
    const fechaVencimiento = new Date();
    if (dias > 0) {
      fechaVencimiento.setDate(fechaVencimiento.getDate() + dias);
    } else {
      fechaVencimiento.setFullYear(fechaVencimiento.getFullYear() + 1);
    }

    const estado = dias > 0 ? EstadoSuscripcion.PRUEBA : EstadoSuscripcion.ACTIVA;

    const suscripcion = await this.prisma.suscripcion.create({
      data: {
        juntaId,
        planId,
        fechaInicio,
        fechaVencimiento,
        estado,
      },
      include: { plan: true },
    });

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

  /** Actualiza suscripción: cambiar plan, renovar, cancelar. */
  async actualizarSuscripcion(
    juntaId: string,
    data: {
      planId?: string;
      fechaVencimiento?: string;
      estado?: EstadoSuscripcion;
    },
    ejecutadoPorId: string,
  ) {
    const suscripcion = await this.prisma.suscripcion.findUnique({
      where: { juntaId },
      include: { plan: true },
    });
    if (!suscripcion) throw new NotFoundException('La junta no tiene suscripción');

    const updateData: Record<string, unknown> = {};
    if (data.planId) {
      const plan = await this.prisma.plan.findUnique({ where: { id: data.planId } });
      if (!plan) throw new NotFoundException('Plan no encontrado');
      updateData.planId = data.planId;
    }
    if (data.fechaVencimiento) {
      updateData.fechaVencimiento = new Date(data.fechaVencimiento);
    }
    if (data.estado !== undefined) {
      updateData.estado = data.estado;
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

  /** Uso de la junta: usuarios activos, pagos/mes, cartas/mes, documentos. */
  async uso(juntaId: string) {
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const now = new Date();
    const inicioMes = new Date(now.getFullYear(), now.getMonth(), 1);

    const [usuariosActivos, pagosEsteMes, cartasEsteMes, documentosCount] =
      await Promise.all([
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
        this.prisma.documento.count({
          where: {
            usuario: { juntaId },
          },
        }),
      ]);

    return {
      data: {
        usuariosActivos,
        pagosEsteMes,
        cartasEsteMes,
        documentosCount,
        mes: now.toLocaleString('es-CO', { month: 'long', year: 'numeric' }),
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
      nit: dto.nit,
      montoCarta: dto.montoCarta,
      adminUser: dto.adminUser,
      passwordTemporal,
      ejecutadoPorId,
      planId: dto.planId,
      diasPrueba: dto.diasPrueba,
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
      enMantenimiento?: boolean;
    },
    ejecutadoPorId: string,
  ) {
    const junta = await this.prisma.junta.findUnique({ where: { id } });
    if (!junta) {
      throw new NotFoundException('Junta no encontrada');
    }

    const updateData: Record<string, unknown> = {
      ...(data.nombre !== undefined && { nombre: data.nombre }),
      ...(data.nit !== undefined && { nit: data.nit }),
      ...(data.montoCarta !== undefined && { montoCarta: data.montoCarta }),
      ...(data.activo !== undefined && { activo: data.activo }),
      ...(data.activo === false && { fechaBaja: new Date() }),
      ...(data.activo === true && { fechaBaja: null }),
      ...(data.telefono !== undefined && { telefono: data.telefono }),
      ...(data.email !== undefined && { email: data.email }),
      ...(data.direccion !== undefined && { direccion: data.direccion }),
      ...(data.ciudad !== undefined && { ciudad: data.ciudad }),
      ...(data.departamento !== undefined && { departamento: data.departamento }),
      ...(data.enMantenimiento !== undefined && { enMantenimiento: data.enMantenimiento }),
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
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const admin = await this.obtenerAdminDeJunta(juntaId);
    if (!admin) throw new NotFoundException('No hay admin asignado en esta junta');

    const passwordTemporal = generarPasswordTemporal();
    const passwordHash = await bcrypt.hash(passwordTemporal, 10);

    await this.prisma.usuario.update({
      where: { id: admin.id },
      data: { passwordHash },
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
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const nuevoAdmin = await this.prisma.usuario.findFirst({
      where: { id: nuevoAdminUsuarioId, juntaId },
      include: { roles: { include: { rol: true } } },
    });
    if (!nuevoAdmin) {
      throw new BadRequestException('El usuario no existe o no pertenece a esta junta');
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
    const junta = await this.prisma.junta.findUnique({ where: { id: juntaId } });
    if (!junta) throw new NotFoundException('Junta no encontrada');

    const admin = await this.obtenerAdminDeJunta(juntaId);
    if (!admin) throw new NotFoundException('No hay admin asignado en esta junta');

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
