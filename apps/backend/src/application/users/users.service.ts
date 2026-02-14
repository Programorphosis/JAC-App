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

@Injectable()
export class UsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listar(juntaId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;

    const [usuarios, total] = await Promise.all([
      this.prisma.usuario.findMany({
        where: { juntaId },
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
        orderBy: { apellidos: 'asc' },
      }),
      this.prisma.usuario.count({ where: { juntaId } }),
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
    const roles = dto.roles?.length ? dto.roles : ['CIUDADANO'];

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

    await this.prisma.usuario.update({
      where: { id },
      data: {
        ...(dto.nombres !== undefined && { nombres: dto.nombres }),
        ...(dto.apellidos !== undefined && { apellidos: dto.apellidos }),
        ...(dto.telefono !== undefined && { telefono: dto.telefono }),
        ...(dto.direccion !== undefined && { direccion: dto.direccion }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
      },
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
