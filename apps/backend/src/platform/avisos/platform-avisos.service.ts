import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AlcanceAviso, RolNombre } from '@prisma/client';
import { CrearAvisoDto, AlcanceAvisoDto } from '../dto/crear-aviso.dto';
import { ActualizarAvisoDto } from '../dto/actualizar-aviso.dto';
import type { JwtUser } from '../../auth/strategies/jwt.strategy';

const ROLES_OPERATIVOS: RolNombre[] = [
  'ADMIN',
  'SECRETARIA',
  'TESORERA',
  'FISCAL',
  'RECEPTOR_AGUA',
];

/**
 * PA-9: Avisos de plataforma para el dashboard.
 * Alcance: PLATAFORMA (solo admin), TODAS_JUNTAS (todas las juntas), JUNTA_ESPECIFICA (una junta).
 * soloOperativos: si true, solo usuarios con rol operativo ven el aviso.
 */
@Injectable()
export class PlatformAvisosService {
  constructor(private readonly prisma: PrismaService) {}

  private esUsuarioOperativo(roles: RolNombre[]): boolean {
    return roles.some((r) => ROLES_OPERATIVOS.includes(r));
  }

  /** Lista avisos activos visibles para una junta (dashboard de junta). Filtra por soloOperativos si aplica. */
  async listarActivos(juntaId: string | null, user?: JwtUser) {
    if (!juntaId) {
      return { data: [] };
    }
    const avisos = await this.prisma.avisoPlataforma.findMany({
      where: {
        activo: true,
        OR: [
          { alcance: 'TODAS_JUNTAS' },
          { alcance: 'JUNTA_ESPECIFICA', juntaId },
        ],
      },
      orderBy: { fechaPublicacion: 'desc' },
      take: 20,
    });
    const esOperativo = user ? this.esUsuarioOperativo(user.roles) : true;
    const filtrados = avisos.filter((a) => {
      if (!a.soloOperativos) return true;
      return esOperativo;
    });
    return { data: filtrados };
  }

  /** Lista todos los avisos para administración (incluye inactivos y todos los alcances). */
  async listarTodos(activo?: boolean) {
    const where = activo !== undefined ? { activo } : {};
    const avisos = await this.prisma.avisoPlataforma.findMany({
      where,
      orderBy: { fechaPublicacion: 'desc' },
      take: 50,
      include: { junta: { select: { id: true, nombre: true } } },
    });
    return { data: avisos };
  }

  async crear(dto: CrearAvisoDto) {
    const alcance = (dto.alcance ??
      AlcanceAvisoDto.TODAS_JUNTAS) as AlcanceAviso;
    if (alcance === 'JUNTA_ESPECIFICA' && !dto.juntaId) {
      throw new BadRequestException(
        'Debe seleccionar una junta cuando el alcance es JUNTA_ESPECIFICA',
      );
    }
    if (alcance !== 'JUNTA_ESPECIFICA' && dto.juntaId) {
      throw new BadRequestException(
        'juntaId solo aplica cuando el alcance es JUNTA_ESPECIFICA',
      );
    }
    const aviso = await this.prisma.avisoPlataforma.create({
      data: {
        titulo: dto.titulo,
        contenido: dto.contenido,
        alcance,
        juntaId: alcance === 'JUNTA_ESPECIFICA' ? dto.juntaId : null,
        soloOperativos: dto.soloOperativos ?? false,
      },
      include: { junta: { select: { id: true, nombre: true } } },
    });
    return { data: aviso };
  }

  async actualizar(id: string, dto: ActualizarAvisoDto) {
    const existente = await this.prisma.avisoPlataforma.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundException('Aviso no encontrado');

    const alcance = dto.alcance as AlcanceAviso | undefined;
    if (
      alcance === 'JUNTA_ESPECIFICA' &&
      dto.juntaId === undefined &&
      !existente.juntaId
    ) {
      throw new BadRequestException(
        'Debe seleccionar una junta cuando el alcance es JUNTA_ESPECIFICA',
      );
    }
    if (
      alcance !== undefined &&
      alcance !== 'JUNTA_ESPECIFICA' &&
      dto.juntaId !== undefined &&
      dto.juntaId !== null
    ) {
      throw new BadRequestException(
        'juntaId solo aplica cuando el alcance es JUNTA_ESPECIFICA',
      );
    }

    const _alcanceFinal = alcance ?? existente.alcance;
    const juntaIdFinal =
      dto.alcance !== undefined
        ? dto.alcance === AlcanceAvisoDto.JUNTA_ESPECIFICA
          ? (dto.juntaId ?? existente.juntaId)
          : null
        : dto.juntaId !== undefined
          ? dto.juntaId
          : existente.juntaId;

    const aviso = await this.prisma.avisoPlataforma.update({
      where: { id },
      data: {
        ...(dto.titulo !== undefined && { titulo: dto.titulo }),
        ...(dto.contenido !== undefined && { contenido: dto.contenido }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
        ...(dto.alcance !== undefined && {
          alcance: dto.alcance as AlcanceAviso,
        }),
        ...(dto.alcance !== undefined || dto.juntaId !== undefined
          ? { juntaId: juntaIdFinal }
          : {}),
        ...(dto.soloOperativos !== undefined && {
          soloOperativos: dto.soloOperativos,
        }),
      },
      include: { junta: { select: { id: true, nombre: true } } },
    });
    return { data: aviso };
  }

  async eliminar(id: string) {
    const existente = await this.prisma.avisoPlataforma.findUnique({
      where: { id },
    });
    if (!existente) throw new NotFoundException('Aviso no encontrado');

    await this.prisma.avisoPlataforma.delete({ where: { id } });
    return { data: { id } };
  }
}
