import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../domain/services/audit.service';
import type { JwtUser } from '../../auth/strategies/jwt.strategy';
import { CrearAvisoJuntaDto } from './dto/crear-aviso-junta.dto';
import { ActualizarAvisoJuntaDto } from './dto/actualizar-aviso-junta.dto';

/**
 * Avisos de junta – comunicados admin/secretaria → afiliados.
 * Independiente de AvisoPlataforma (platform admin). Escalable para futura separación.
 */
@Injectable()
export class AvisosJuntaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  /** Lista avisos activos de la junta (todos los usuarios de junta). */
  async listarActivos(juntaId: string | null): Promise<{ data: AvisoJuntaListItem[] }> {
    if (!juntaId) return { data: [] };
    const avisos = await this.prisma.avisoJunta.findMany({
      where: { juntaId, activo: true },
      orderBy: { fechaPublicacion: 'desc' },
      select: {
        id: true,
        titulo: true,
        contenido: true,
        fechaPublicacion: true,
        creadoPor: { select: { nombres: true, apellidos: true } },
      },
    });
    return { data: avisos };
  }

  /** Lista todos los avisos (activos e inactivos) para gestión. ADMIN, SECRETARIA. */
  async listarTodos(juntaId: string, activo?: boolean): Promise<{ data: AvisoJuntaListItem[] }> {
    const where: { juntaId: string; activo?: boolean } = { juntaId };
    if (activo !== undefined) where.activo = activo;
    const avisos = await this.prisma.avisoJunta.findMany({
      where,
      orderBy: { fechaPublicacion: 'desc' },
      select: {
        id: true,
        titulo: true,
        contenido: true,
        fechaPublicacion: true,
        activo: true,
        creadoPor: { select: { nombres: true, apellidos: true } },
      },
    });
    return { data: avisos };
  }

  /** Crea aviso. ADMIN, SECRETARIA. */
  async crear(juntaId: string, user: JwtUser, dto: CrearAvisoJuntaDto) {
    const aviso = await this.prisma.avisoJunta.create({
      data: {
        juntaId,
        titulo: dto.titulo.trim(),
        contenido: dto.contenido.trim(),
        creadoPorId: user.id,
      },
      select: {
        id: true,
        titulo: true,
        contenido: true,
        fechaPublicacion: true,
        activo: true,
        creadoPor: { select: { nombres: true, apellidos: true } },
      },
    });
    await this.audit.registerEvent({
      juntaId,
      entidad: 'AvisoJunta',
      entidadId: aviso.id,
      accion: 'CREAR',
      metadata: { titulo: aviso.titulo },
      ejecutadoPorId: user.id,
    });
    return { data: aviso };
  }

  /** Actualiza aviso. ADMIN, SECRETARIA. */
  async actualizar(
    id: string,
    juntaId: string,
    user: JwtUser,
    dto: ActualizarAvisoJuntaDto,
  ) {
    const existente = await this.prisma.avisoJunta.findFirst({
      where: { id, juntaId },
    });
    if (!existente) throw new NotFoundException('Aviso no encontrado');
    const aviso = await this.prisma.avisoJunta.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined && { titulo: dto.titulo.trim() }),
        ...(dto.contenido !== undefined && { contenido: dto.contenido.trim() }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
      },
      select: {
        id: true,
        titulo: true,
        contenido: true,
        fechaPublicacion: true,
        activo: true,
        creadoPor: { select: { nombres: true, apellidos: true } },
      },
    });
    await this.audit.registerEvent({
      juntaId,
      entidad: 'AvisoJunta',
      entidadId: aviso.id,
      accion: 'ACTUALIZAR',
      metadata: { titulo: aviso.titulo },
      ejecutadoPorId: user.id,
    });
    return { data: aviso };
  }

  /** Elimina aviso. ADMIN, SECRETARIA. */
  async eliminar(id: string, juntaId: string, user: JwtUser) {
    const existente = await this.prisma.avisoJunta.findFirst({
      where: { id, juntaId },
    });
    if (!existente) throw new NotFoundException('Aviso no encontrado');
    await this.prisma.avisoJunta.delete({ where: { id } });
    await this.audit.registerEvent({
      juntaId,
      entidad: 'AvisoJunta',
      entidadId: id,
      accion: 'ELIMINAR',
      metadata: { titulo: existente.titulo },
      ejecutadoPorId: user.id,
    });
    return { data: { id } };
  }
}

export interface AvisoJuntaListItem {
  id: string;
  titulo: string;
  contenido: string;
  fechaPublicacion: Date;
  activo?: boolean;
  creadoPor?: { nombres: string; apellidos: string } | null;
}
