/**
 * Servicio de cartas - solicitud y validación.
 * Referencia: flujoSolicitudCarta.md
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3StorageService } from '../../infrastructure/storage/s3-storage.service';
import { randomUUID } from 'crypto';

@Injectable()
export class CartasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3StorageService,
  ) {}

  async listarPorUsuario(usuarioId: string, juntaId: string): Promise<
    Array<{
      id: string;
      estado: string;
      fechaSolicitud: Date;
      fechaEmision: Date | null;
      vigenciaHasta: Date | null;
      consecutivo: number | null;
      anio: number;
      rutaPdf: string | null;
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
        vigenciaHasta: true,
        consecutivo: true,
        anio: true,
        rutaPdf: true,
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

    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    const cartaVigente = await this.prisma.carta.findFirst({
      where: {
        usuarioId,
        juntaId,
        estado: 'APROBADA',
        vigenciaHasta: { gte: hoy },
      },
    });
    if (cartaVigente) {
      throw new Error(
        'Tiene una carta vigente. Debe esperar a que venza para poder pagar y solicitar otra.',
      );
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

  /**
   * Obtener URL firmada para descargar PDF de carta aprobada.
   * CIUDADANO: solo propias. ADMIN/SECRETARIA: cualquiera de la junta.
   */
  async getUrlDescargaCarta(
    cartaId: string,
    juntaId: string,
    soloPropios?: string,
  ): Promise<string> {
    const carta = await this.prisma.carta.findFirst({
      where: {
        id: cartaId,
        juntaId,
        estado: 'APROBADA',
        ...(soloPropios ? { usuarioId: soloPropios } : {}),
      },
      select: { rutaPdf: true },
    });
    if (!carta || !carta.rutaPdf) {
      throw new Error('Carta no encontrada o sin PDF disponible');
    }
    if (!this.s3.isConfigured()) {
      throw new Error('El almacenamiento no está configurado');
    }
    return this.s3.getSignedDownloadUrl(carta.rutaPdf);
  }
}
