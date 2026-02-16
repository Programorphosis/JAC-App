import {
  Injectable,
  NotFoundException,
  ConflictException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../domain/services/audit.service';
import * as bcrypt from 'bcrypt';
import { RolNombre } from '@prisma/client';
import type { CreateUserDto } from './dto/create-user.dto';
import type { UpdateUserDto } from './dto/update-user.dto';

const ROLES_UNICOS_POR_JUNTA: RolNombre[] = ['SECRETARIA', 'TESORERA'];
/** Rol base: todos los usuarios de una junta son afiliados. */
const ROL_BASE = RolNombre.AFILIADO;

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Verifica que SECRETARIA y TESORERA sean únicos por junta. Excluye usuarioId si se proporciona. */
  private async validarRolesUnicosPorJunta(
    juntaId: string,
    rolesNuevos: string[],
    excluirUsuarioId?: string,
  ): Promise<void> {
    for (const rol of ROLES_UNICOS_POR_JUNTA) {
      if (!rolesNuevos.includes(rol)) continue;

      const existente = await this.prisma.usuarioRol.findFirst({
        where: {
          rol: { nombre: rol },
          usuario: {
            juntaId,
            ...(excluirUsuarioId && { id: { not: excluirUsuarioId } }),
          },
        },
      });

      if (existente) {
        const mensaje =
          rol === 'SECRETARIA'
            ? 'Ya existe una secretaria en esta junta. Solo puede haber una.'
            : 'Ya existe una tesorera en esta junta. Solo puede haber una.';
        throw new ConflictException(mensaje);
      }
    }
  }

  async listar(
    juntaId: string,
    page = 1,
    limit = 20,
    opts?: {
      search?: string;
      activo?: boolean;
      rol?: string;
      sortBy?: 'apellidos' | 'nombres' | 'numeroDocumento' | 'fechaCreacion';
      sortOrder?: 'asc' | 'desc';
    },
  ) {
    const skip = (page - 1) * limit;
    const search = opts?.search;
    const activo = opts?.activo;
    const rol = opts?.rol;
    const sortBy = opts?.sortBy ?? 'apellidos';
    const sortOrder = opts?.sortOrder ?? 'asc';

    const where: Record<string, unknown> = { juntaId };
    if (search && search.length >= 2) {
      where.OR = [
        { nombres: { contains: search, mode: 'insensitive' } },
        { apellidos: { contains: search, mode: 'insensitive' } },
        { numeroDocumento: { contains: search, mode: 'insensitive' } },
      ];
    }
    if (activo !== undefined) {
      where.activo = activo;
    }
    if (rol && rol.trim()) {
      where.roles = { some: { rol: { nombre: rol.trim() as RolNombre } } };
    }

    const orderBy =
      sortBy === 'apellidos'
        ? [{ apellidos: sortOrder }, { nombres: sortOrder }]
        : sortBy === 'nombres'
          ? [{ nombres: sortOrder }, { apellidos: sortOrder }]
          : { [sortBy]: sortOrder };

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where,
        skip,
        take: limit,
        select: {
          id: true,
          tipoDocumento: true,
          numeroDocumento: true,
          nombres: true,
          apellidos: true,
          telefono: true,
          direccion: true,
          activo: true,
          fechaCreacion: true,
          roles: { include: { rol: { select: { nombre: true } } } },
        },
        orderBy,
      }),
      this.prisma.usuario.count({ where }),
    ]);

    return {
      data: usuarios.map((u) => ({
        ...u,
        roles: u.roles.map((ur) => ur.rol.nombre),
      })),
      meta: { total, page, limit },
    };
  }

  async obtener(id: string, juntaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, juntaId },
      select: {
        id: true,
        tipoDocumento: true,
        numeroDocumento: true,
        nombres: true,
        apellidos: true,
        telefono: true,
        direccion: true,
        activo: true,
        fechaCreacion: true,
        roles: { include: { rol: { select: { nombre: true } } } },
      },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    return {
      ...usuario,
      roles: usuario.roles.map((ur) => ur.rol.nombre),
    };
  }

  async crear(dto: CreateUserDto, juntaId: string, creadoPorId: string) {
    const existente = await this.prisma.usuario.findUnique({
      where: {
        juntaId_numeroDocumento: { juntaId, numeroDocumento: dto.numeroDocumento },
      },
    });

    if (existente) {
      throw new ConflictException(
        `Ya existe un usuario con documento ${dto.numeroDocumento} en esta junta`,
      );
    }

    const passwordHash = await bcrypt.hash(dto.password, 10);
    const rolesRaw = dto.roles?.length ? dto.roles : [];
    const roles = rolesRaw.includes(ROL_BASE) ? rolesRaw : [ROL_BASE, ...rolesRaw];

    await this.validarRolesUnicosPorJunta(juntaId, roles);

    const estadoLaboralInicial = dto.estadoLaboralInicial ?? 'NO_TRABAJANDO';

    const usuario = await this.prisma.$transaction(async (tx) => {
      const u = await tx.usuario.create({
        data: {
          juntaId,
          tipoDocumento: dto.tipoDocumento,
          numeroDocumento: dto.numeroDocumento,
          nombres: dto.nombres,
          apellidos: dto.apellidos,
          telefono: dto.telefono ?? null,
          direccion: dto.direccion ?? null,
          passwordHash,
        },
      });

      const rolesDb = await tx.rol.findMany({
        where: { nombre: { in: roles as RolNombre[] } },
      });

      for (const rol of rolesDb) {
        await tx.usuarioRol.create({
          data: { usuarioId: u.id, rolId: rol.id },
        });
      }

      // Historial laboral inicial: desde fechaCreacion, sin fechaFin (vigente)
      await tx.historialLaboral.create({
        data: {
          usuarioId: u.id,
          estado: estadoLaboralInicial,
          fechaInicio: u.fechaCreacion,
          fechaFin: null,
          creadoPorId,
        },
      });

      return u;
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Usuario',
      entidadId: usuario.id,
      accion: 'CREACION_USUARIO',
      metadata: {
        numeroDocumento: usuario.numeroDocumento,
        creadoPorId,
      },
      ejecutadoPorId: creadoPorId,
    });

    return {
      id: usuario.id,
      tipoDocumento: usuario.tipoDocumento,
      numeroDocumento: usuario.numeroDocumento,
      nombres: usuario.nombres,
      apellidos: usuario.apellidos,
      roles,
    };
  }

  async actualizar(id: string, dto: UpdateUserDto, juntaId: string, actualizadoPorId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id, juntaId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    let rolesFinales: string[] | undefined;
    if (dto.roles !== undefined && dto.roles.length > 0) {
      rolesFinales = dto.roles.includes(ROL_BASE) ? dto.roles : [ROL_BASE, ...dto.roles];
      await this.validarRolesUnicosPorJunta(juntaId, rolesFinales, id);
    }

    await this.prisma.$transaction(async (tx) => {
      await tx.usuario.update({
        where: { id },
        data: {
          ...(dto.nombres !== undefined && { nombres: dto.nombres }),
          ...(dto.apellidos !== undefined && { apellidos: dto.apellidos }),
          ...(dto.telefono !== undefined && { telefono: dto.telefono }),
          ...(dto.direccion !== undefined && { direccion: dto.direccion }),
          ...(dto.activo !== undefined && { activo: dto.activo }),
        },
      });

      if (rolesFinales !== undefined) {
        await tx.usuarioRol.deleteMany({ where: { usuarioId: id } });
        const rolesDb = await tx.rol.findMany({
          where: { nombre: { in: rolesFinales as RolNombre[] } },
        });
        for (const rol of rolesDb) {
          await tx.usuarioRol.create({
            data: { usuarioId: id, rolId: rol.id },
          });
        }
      }
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'Usuario',
      entidadId: id,
      accion: 'ACTUALIZACION_USUARIO',
      metadata: { campos: Object.keys(dto) },
      ejecutadoPorId: actualizadoPorId,
    });

    return this.obtener(id, juntaId);
  }
}
