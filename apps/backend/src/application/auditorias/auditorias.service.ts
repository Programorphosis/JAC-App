import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AuditoriaItem {
  id: string;
  entidad: string;
  entidadId: string;
  accion: string;
  metadata: Record<string, unknown>;
  fecha: Date;
  ejecutadoPor: { id: string; nombres: string; apellidos: string };
}

@Injectable()
export class AuditoriasService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPorJunta(
    juntaId: string,
    opts?: {
      limit?: number;
      offset?: number;
      entidad?: string;
      search?: string;
      sortBy?: 'fecha' | 'accion' | 'entidad';
      sortOrder?: 'asc' | 'desc';
    },
  ): Promise<{ data: AuditoriaItem[]; total: number }> {
    const limit = Math.min(opts?.limit ?? 50, 100);
    const offset = opts?.offset ?? 0;
    const sortBy = opts?.sortBy ?? 'fecha';
    const sortOrder = opts?.sortOrder ?? 'desc';

    const where: Record<string, unknown> = { juntaId };
    if (opts?.entidad?.trim()) where.entidad = opts.entidad.trim();
    if (opts?.search && opts.search.trim().length >= 2) {
      const term = opts.search.trim();
      where.OR = [
        { accion: { contains: term, mode: 'insensitive' } },
        { entidad: { contains: term, mode: 'insensitive' } },
        { ejecutadoPor: { nombres: { contains: term, mode: 'insensitive' } } },
        {
          ejecutadoPor: { apellidos: { contains: term, mode: 'insensitive' } },
        },
      ];
    }

    const orderBy = { [sortBy]: sortOrder };

    const [data, total] = await Promise.all([
      this.prisma.auditoria.findMany({
        where,
        orderBy,
        take: limit,
        skip: offset,
        include: {
          ejecutadoPor: {
            select: { id: true, nombres: true, apellidos: true },
          },
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
        metadata: (a.metadata as Record<string, unknown>) ?? {},
        fecha: a.fecha,
        ejecutadoPor: a.ejecutadoPor,
      })),
      total,
    };
  }
}
