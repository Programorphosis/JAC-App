import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * Servicio de auditoría de plataforma.
 * Responsabilidad: listar acciones sobre juntas (CREACION, ACTUALIZACION, BAJA).
 * Dependencias: solo Prisma. Sin lógica de negocio de juntas.
 */
@Injectable()
export class PlatformAuditoriaService {
  constructor(private readonly prisma: PrismaService) {}

  async listar(page = 1, limit = 50) {
    const skip = (page - 1) * limit;
    const where = { entidad: 'Junta' };
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
