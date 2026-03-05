import { BadRequestException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../domain/services/audit.service';
import { normalizarTelefonoColombia } from '../../common/utils/validacion-telefono.util';
import * as bcrypt from 'bcrypt';
import {
  RolNombre,
  EstadoSuscripcion,
  EstadoFactura,
  TipoFactura,
} from '@prisma/client';
import {
  calcularFechaVencimiento,
  getEstadoSuscripcion,
} from '../../common/utils/suscripcion-fechas.util';

export interface CreateJuntaAdminUser {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono?: string;
  direccion?: string;
}

/** Versión de términos de servicio para trazabilidad de aceptación (Ley 527). */
export const TERMINOS_VERSION = '2026-02-25';

export interface CreateJuntaParams {
  nombre: string;
  email: string;
  telefono: string;
  nit?: string;
  montoCarta?: number;
  adminUser: CreateJuntaAdminUser;
  passwordTemporal: string;
  ejecutadoPorId: string;
  planId?: string;
  diasPrueba?: number;
  /** Requerido: aceptación de términos de servicio (Ley 527). */
  aceptoTerminos: boolean;
}

export interface CreateJuntaResult {
  junta: {
    id: string;
    nombre: string;
    nit: string | null;
    montoCarta: number | null;
  };
  adminUsuario: {
    id: string;
    nombres: string;
    apellidos: string;
    numeroDocumento: string;
  };
  passwordTemporal: string;
}

/**
 * JuntaService - Creación de juntas reutilizable.
 * Usado por: Bootstrap, POST /api/platform/juntas
 * Referencia: flujoBootstrapYOnboarding.md §6
 */
@Injectable()
export class JuntaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async createJunta(params: CreateJuntaParams): Promise<CreateJuntaResult> {
    if (!params.aceptoTerminos) {
      throw new BadRequestException(
        'Se requiere aceptar los términos de servicio para crear una junta',
      );
    }
    const emailNorm = params.email?.trim().toLowerCase();
    if (!emailNorm || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(emailNorm)) {
      throw new BadRequestException('El email de la junta no es válido');
    }
    const telefonoNorm = normalizarTelefonoColombia(params.telefono);
    if (!telefonoNorm) {
      throw new BadRequestException(
        'El teléfono de la junta debe ser un número colombiano válido (10 dígitos)',
      );
    }
    const passwordHash = await bcrypt.hash(params.passwordTemporal, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const junta = await tx.junta.create({
        data: {
          nombre: params.nombre,
          email: emailNorm,
          telefono: telefonoNorm,
          nit: params.nit ?? null,
          montoCarta: params.montoCarta ?? null,
          terminosAceptadosEn: new Date(),
          terminosVersion: TERMINOS_VERSION,
        },
      });

      const rolAdmin = await tx.rol.findUniqueOrThrow({
        where: { nombre: RolNombre.ADMIN },
      });

      const adminUsuario = await tx.usuario.create({
        data: {
          juntaId: junta.id,
          tipoDocumento: params.adminUser.tipoDocumento,
          numeroDocumento: params.adminUser.numeroDocumento,
          nombres: params.adminUser.nombres,
          apellidos: params.adminUser.apellidos,
          telefono: params.adminUser.telefono ?? null,
          direccion: params.adminUser.direccion ?? null,
          passwordHash,
          requiereCambioPassword: true,
        },
      });

      await tx.usuarioRol.create({
        data: {
          usuarioId: adminUsuario.id,
          rolId: rolAdmin.id,
        },
      });

      // PA-4: crear suscripción si se especifica plan
      let planId = params.planId;
      if (!planId) {
        const planBasico = await tx.plan.findFirst({
          where: { nombre: 'Básico', activo: true },
        });
        planId = planBasico?.id ?? undefined;
      }
      if (planId) {
        const plan = await tx.plan.findUniqueOrThrow({ where: { id: planId } });
        const dias = params.diasPrueba ?? plan.diasPrueba ?? 0;
        const periodo = 'anual' as const;
        const fechaInicio = new Date();
        const fechaVencimiento = calcularFechaVencimiento({
          fechaInicio,
          diasPrueba: dias,
          periodo: dias > 0 ? undefined : periodo,
        });
        const estado = getEstadoSuscripcion(dias) as EstadoSuscripcion;
        const suscripcion = await tx.suscripcion.create({
          data: {
            juntaId: junta.id,
            planId,
            fechaInicio,
            fechaVencimiento,
            periodo,
            estado,
          },
        });
        if (dias > 0) {
          const monto = plan.precioAnual;
          await tx.factura.create({
            data: {
              juntaId: junta.id,
              suscripcionId: suscripcion.id,
              monto,
              fechaVencimiento: new Date(fechaVencimiento),
              estado: EstadoFactura.PENDIENTE,
              tipo: TipoFactura.SUSCRIPCION,
              metadata: { periodo },
              creadoPorId: params.ejecutadoPorId,
            },
          });
        }
      }

      return { junta, adminUsuario };
    });

    await this.audit.registerEvent({
      juntaId: result.junta.id,
      entidad: 'Junta',
      entidadId: result.junta.id,
      accion: 'CREACION_JUNTA',
      metadata: {
        nombre: result.junta.nombre,
        adminUsuarioId: result.adminUsuario.id,
      },
      ejecutadoPorId: params.ejecutadoPorId,
    });

    return {
      junta: {
        id: result.junta.id,
        nombre: result.junta.nombre,
        nit: result.junta.nit,
        montoCarta: result.junta.montoCarta,
      },
      adminUsuario: {
        id: result.adminUsuario.id,
        nombres: result.adminUsuario.nombres,
        apellidos: result.adminUsuario.apellidos,
        numeroDocumento: result.adminUsuario.numeroDocumento,
      },
      passwordTemporal: params.passwordTemporal,
    };
  }
}
