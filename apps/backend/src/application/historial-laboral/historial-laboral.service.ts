import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../domain/services/audit.service';
import type { CreateHistorialLaboralDto } from './dto/create-historial-laboral.dto';

@Injectable()
export class HistorialLaboralService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async listar(usuarioId: string, juntaId: string) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const registros = await this.prisma.historialLaboral.findMany({
      where: { usuarioId },
      orderBy: { fechaInicio: 'desc' },
      select: {
        id: true,
        estado: true,
        fechaInicio: true,
        fechaFin: true,
        fechaCreacion: true,
        creadoPor: { select: { nombres: true, apellidos: true } },
      },
    });

    return { data: registros };
  }

  async crear(
    usuarioId: string,
    dto: CreateHistorialLaboralDto,
    juntaId: string,
    creadoPorId: string,
  ) {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
    });

    if (!usuario) {
      throw new NotFoundException('Usuario no encontrado');
    }

    const registro = await this.prisma.historialLaboral.create({
      data: {
        usuarioId,
        estado: dto.estado as 'TRABAJANDO' | 'NO_TRABAJANDO',
        fechaInicio: new Date(dto.fechaInicio),
        fechaFin: dto.fechaFin ? new Date(dto.fechaFin) : null,
        creadoPorId,
      },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'HistorialLaboral',
      entidadId: registro.id,
      accion: 'ALTA_HISTORIAL_LABORAL',
      metadata: {
        usuarioId,
        estado: dto.estado,
        fechaInicio: dto.fechaInicio,
        fechaFin: dto.fechaFin ?? null,
      },
      ejecutadoPorId: creadoPorId,
    });

    return registro;
  }
}
