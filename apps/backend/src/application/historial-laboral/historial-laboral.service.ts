import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../domain/services/audit.service';
import { HistorialLaboralSuperpuestoError } from '../../domain/errors';
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

    const fechaInicioNueva = new Date(dto.fechaInicio);
    const fechaFinAnterior = new Date(fechaInicioNueva);
    fechaFinAnterior.setDate(fechaFinAnterior.getDate() - 1);
    const fechaFinNueva = dto.fechaFin ? new Date(dto.fechaFin) : null;

    const registro = await this.prisma.$transaction(async (tx) => {
      // Validar solapamiento contra registros CERRADOS (el vigente se cierra antes de crear el nuevo).
      // Un registro cerrado solapa si su intervalo intersecta con el nuevo.
      const cerrados = await tx.historialLaboral.findMany({
        where: { usuarioId, fechaFin: { not: null } },
        select: { id: true, fechaInicio: true, fechaFin: true },
      });

      const nuevoFin = fechaFinNueva ?? new Date('9999-12-31');
      for (const r of cerrados) {
        const rFin = r.fechaFin!;
        const solapa = fechaInicioNueva <= rFin && r.fechaInicio <= nuevoFin;
        if (solapa) {
          throw new HistorialLaboralSuperpuestoError(usuarioId);
        }
      }

      // Validar que la nueva fechaInicio sea posterior al inicio del registro vigente.
      // Si no, al cerrar el vigente con fechaFin = fechaInicioNueva - 1, quedaría fechaFin < fechaInicio.
      const vigenteCheck = await tx.historialLaboral.findFirst({
        where: { usuarioId, fechaFin: null },
        select: { fechaInicio: true },
      });
      if (vigenteCheck && fechaInicioNueva <= vigenteCheck.fechaInicio) {
        throw new HistorialLaboralSuperpuestoError(usuarioId);
      }

      // Cerrar el registro vigente (fechaFin=null): poner fechaFin = día anterior al nuevo inicio
      const vigente = await tx.historialLaboral.findFirst({
        where: { usuarioId, fechaFin: null },
        orderBy: { fechaInicio: 'desc' },
      });
      if (vigente) {
        await tx.historialLaboral.update({
          where: { id: vigente.id },
          data: { fechaFin: fechaFinAnterior },
        });
      }

      return tx.historialLaboral.create({
        data: {
          usuarioId,
          estado: dto.estado as 'TRABAJANDO' | 'NO_TRABAJANDO',
          fechaInicio: fechaInicioNueva,
          fechaFin: fechaFinNueva,
          creadoPorId,
        },
      });
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
