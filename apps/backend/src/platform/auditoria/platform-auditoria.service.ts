import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';

export type TipoAuditoriaPlataforma = 'juntas' | 'accesos' | 'all';

/**
 * Servicio de auditoría de plataforma.
 * Responsabilidad: listar acciones (juntas, accesos sensibles, o todas).
 * - juntas: CREACION, ACTUALIZACION, BAJA de Junta.
 * - accesos: LOGIN_*, IMPERSONACION_*, CAMBIO_ROL (entidad Auth/Usuario).
 * - all: sin filtro por entidad.
 */
@Injectable()
export class PlatformAuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(page = 1, limit = 50, tipo: TipoAuditoriaPlataforma = 'all') {
    const skip = (page - 1) * limit;
    const where: Prisma.AuditoriaWhereInput =
      tipo === 'juntas'
        ? { entidad: 'Junta' }
        : tipo === 'accesos'
          ? { entidad: { in: ['Auth', 'Usuario'] } }
          : {};
    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        skip,
        take: limit,
        orderBy: { fecha: 'desc' },
        include: {
          ejecutadoPor: { select: { id: true, nombres: true, apellidos: true } },
          junta: { select: { id: true, nombre: true } },
        },
      }),
      this.prisma.auditoria.count({ where }),
    ]);

    return {
      data: data.map((a) => ({
        id: a.id,
        entidad: a.entidad,
        entidadId: a.entidadId,
        accion: a.accion,
        metadata: a.metadata as Record<string, unknown>,
        fecha: a.fecha,
        ejecutadoPor: a.ejecutadoPor,
        junta: a.junta,
      })),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }
}
