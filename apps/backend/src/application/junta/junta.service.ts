import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../domain/services/audit.service';
import * as bcrypt from 'bcrypt';
import { RolNombre } from '@prisma/client';

export interface CreateJuntaAdminUser {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono?: string;
  direccion?: string;
}

export interface CreateJuntaParams {
  nombre: string;
  nit?: string;
  montoCarta?: number;
  adminUser: CreateJuntaAdminUser;
  passwordTemporal: string;
  ejecutadoPorId: string;
}

export interface CreateJuntaResult {
  junta: { id: string; nombre: string; nit: string | null; montoCarta: number | null };
  adminUsuario: { id: string; nombres: string; apellidos: string; numeroDocumento: string };
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
    const passwordHash = await bcrypt.hash(params.passwordTemporal, 10);

    const result = await this.prisma.$transaction(async (tx) => {
      const junta = await tx.junta.create({
        data: {
          nombre: params.nombre,
          nit: params.nit ?? null,
          montoCarta: params.montoCarta ?? null,
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
        },
      });

      await tx.usuarioRol.create({
        data: {
          usuarioId: adminUsuario.id,
          rolId: rolAdmin.id,
        },
      });

      return { junta, adminUsuario };
    });

    await this.audit.registerEvent({
      juntaId: result.junta.id,
      entidad: 'Junta',
      entidadId: result.junta.id,
      accion: 'CREACION_JUNTA',
      metadata: { nombre: result.junta.nombre, adminUsuarioId: result.adminUsuario.id },
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
