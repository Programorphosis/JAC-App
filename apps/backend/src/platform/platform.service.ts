import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { JuntaService, CreateJuntaAdminUser, CreateJuntaResult } from '../application/junta/junta.service';
import { AuditService } from '../domain/services/audit.service';
import { randomBytes } from 'crypto';

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
}

@Injectable()
export class PlatformService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly juntaService: JuntaService,
    private readonly audit: AuditService,
  ) {}

  async listarJuntas(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [juntas, total] = await Promise.all([
      this.prisma.junta.findMany({
        skip,
        take: limit,
        orderBy: { fechaCreacion: 'desc' },
        select: {
          id: true,
          nombre: true,
          nit: true,
          montoCarta: true,
          fechaCreacion: true,
          _count: { select: { usuarios: true, pagos: true } },
        },
      }),
      this.prisma.junta.count(),
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

  async obtenerJunta(id: string) {
    const junta = await this.prisma.junta.findUnique({
      where: { id },
      select: {
        id: true,
        nombre: true,
        nit: true,
        montoCarta: true,
        fechaCreacion: true,
        _count: { select: { usuarios: true, pagos: true, cartas: true } },
      },
    });

    if (!junta) {
      throw new NotFoundException('Junta no encontrada');
    }

    return { data: junta };
  }

  async crearJunta(
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
    });

    return { data: result };
  }

  async actualizarJunta(
    id: string,
    data: { nombre?: string; nit?: string; montoCarta?: number },
    ejecutadoPorId: string,
  ) {
    const junta = await this.prisma.junta.findUnique({ where: { id } });
    if (!junta) {
      throw new NotFoundException('Junta no encontrada');
    }

    const actualizada = await this.prisma.junta.update({
      where: { id },
      data: {
        ...(data.nombre !== undefined && { nombre: data.nombre }),
        ...(data.nit !== undefined && { nit: data.nit }),
        ...(data.montoCarta !== undefined && { montoCarta: data.montoCarta }),
      },
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
}
