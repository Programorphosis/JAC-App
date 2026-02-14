/**
 * Servicio de cartas - solicitud y validación.
 * Referencia: flujoSolicitudCarta.md
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CartasService {
  constructor(private readonly prisma: PrismaService) {}

  async listarPorUsuario(usuarioId: string, juntaId: string): Promise<
    Array<{
      id: string;
      estado: string;
      fechaSolicitud: Date;
      fechaEmision: Date | null;
      consecutivo: number | null;
      anio: number;
    }>
  > {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
    });
    if (!usuario) {
      throw new Error('Usuario no encontrado en la junta');
    }

    const cartas = await this.prisma.carta.findMany({
      where: { usuarioId, juntaId },
      orderBy: { fechaSolicitud: 'desc' },
      select: {
        id: true,
        estado: true,
        fechaSolicitud: true,
        fechaEmision: true,
        consecutivo: true,
        anio: true,
      },
    });
    return cartas;
  }

  async listarPendientes(juntaId: string): Promise<
    Array<{
      id: string;
      usuarioId: string;
      usuarioNombres: string;
      usuarioApellidos: string;
      usuarioDocumento: string;
      estado: string;
      fechaSolicitud: Date;
    }>
  > {
    const cartas = await this.prisma.carta.findMany({
      where: { juntaId, estado: 'PENDIENTE' },
      orderBy: { fechaSolicitud: 'asc' },
      include: {
        usuario: {
          select: {
            id: true,
            nombres: true,
            apellidos: true,
            numeroDocumento: true,
          },
        },
      },
    });
    return cartas.map((c) => ({
      id: c.id,
      usuarioId: c.usuario.id,
      usuarioNombres: c.usuario.nombres,
      usuarioApellidos: c.usuario.apellidos,
      usuarioDocumento: c.usuario.numeroDocumento,
      estado: c.estado,
      fechaSolicitud: c.fechaSolicitud,
    }));
  }

  async solicitar(usuarioId: string, juntaId: string): Promise<{
    id: string;
    estado: string;
    fechaSolicitud: Date;
  }> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
    });
    if (!usuario) {
      throw new Error('Usuario no encontrado en la junta');
    }

    const pendiente = await this.prisma.carta.findFirst({
      where: {
        usuarioId,
        juntaId,
        estado: 'PENDIENTE',
      },
    });
    if (pendiente) {
      throw new Error('Ya existe una carta pendiente para este usuario');
    }

    const anio = new Date().getFullYear();
    const carta = await this.prisma.carta.create({
      data: {
        juntaId,
        usuarioId,
        consecutivo: null,
        anio,
        estado: 'PENDIENTE',
        qrToken: randomUUID(),
      },
    });

    await this.prisma.auditoria.create({
      data: {
        juntaId,
        entidad: 'Carta',
        entidadId: carta.id,
        accion: 'SOLICITUD_CARTA',
        metadata: { usuarioId },
        ejecutadoPorId: usuarioId,
      },
    });

    return {
      id: carta.id,
      estado: carta.estado,
      fechaSolicitud: carta.fechaSolicitud,
    };
  }
}
