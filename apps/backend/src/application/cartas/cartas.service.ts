/**
 * Servicio de cartas - solicitud y validación.
 * Referencia: flujoSolicitudCarta.md, DISENO_AUTOVALIDACION_CARTAS.md
 *
 * Autovalidación: si cumple requisitos, la carta se emite automáticamente sin pasar por PENDIENTE.
 */
import { Injectable } from '@nestjs/common';
import { TipoPago, RolNombre } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { S3StorageService } from '../../infrastructure/storage/s3-storage.service';
import { DebtService } from '../../domain/services/debt.service';
import { LetterEmissionRunner } from '../../infrastructure/letter/letter-emission-runner.service';
import { LimitesService } from '../../infrastructure/limits/limites.service';
import { randomUUID } from 'crypto';
import {
  UsuarioNoEncontradoError,
  UsuarioInactivoError,
  CartaPendienteExistenteError,
  CartaVigenteError,
  CartaNoEncontradaError,
  CartaNoPendienteError,
  AlmacenamientoNoConfiguradoError,
  RequisitosCartaNoCumplidosError,
} from '../../domain/errors';

export interface SolicitarCartaResult {
  id: string;
  estado: string;
  fechaSolicitud: Date;
  consecutivo?: number;
  anio?: number;
  rutaPdf?: string | null;
}

@Injectable()
export class CartasService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3StorageService,
    private readonly debtService: DebtService,
    private readonly letterRunner: LetterEmissionRunner,
    private readonly limites: LimitesService,
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
      motivoRechazo: string | null;
      qrToken: string | null;
    }>
  > {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
    });
    if (!usuario) {
      throw new UsuarioNoEncontradoError(usuarioId);
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
        motivoRechazo: true,
        qrToken: true,
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

  /**
   * Solicitar carta. Autovalidación: si cumple requisitos, se emite de inmediato.
   * Si no cumple, lanza RequisitosCartaNoCumplidosError.
   * @param ejecutadoPorId Quien ejecuta (AFILIADO o SECRETARIA). Para emitidaPorId: si es AFILIADO propio → ADMIN junta; si SECRETARIA → SECRETARIA.
   */
  async solicitar(
    usuarioId: string,
    juntaId: string,
    ejecutadoPorId: string,
  ): Promise<SolicitarCartaResult> {
    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
    });
    if (!usuario) {
      throw new UsuarioNoEncontradoError(usuarioId);
    }
    if (!usuario.activo) {
      throw new UsuarioInactivoError(usuarioId);
    }

    const pendiente = await this.prisma.carta.findFirst({
      where: { usuarioId, juntaId, estado: 'PENDIENTE' },
    });
    if (pendiente) {
      throw new CartaPendienteExistenteError(usuarioId);
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
      throw new CartaVigenteError(usuarioId);
    }

    await this.validarRequisitosCarta(usuarioId, juntaId);
    await this.limites.validarEmitirCarta(juntaId);

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

    const emitidaPorId =
      ejecutadoPorId === usuarioId
        ? await this.obtenerAdminJunta(juntaId)
        : ejecutadoPorId;

    const result = await this.letterRunner.emitLetter({
      cartaId: carta.id,
      juntaId,
      emitidaPorId,
    });

    return {
      id: carta.id,
      estado: 'APROBADA',
      fechaSolicitud: carta.fechaSolicitud,
      consecutivo: result.consecutivo,
      anio: result.anio,
      rutaPdf: result.rutaPdf,
    };
  }

  /** Valida deuda=0, pago CARTA vigente, requisitos AL_DIA. Lanza si no cumple. */
  private async validarRequisitosCarta(usuarioId: string, juntaId: string): Promise<void> {
    const deuda = await this.debtService.calculateUserDebt({ usuarioId, juntaId });
    if (deuda.total !== 0) {
      throw new RequisitosCartaNoCumplidosError(
        `Deuda pendiente: ${deuda.total}. Debe estar al día para solicitar carta.`,
      );
    }

    const pagoCartaCount = await this.prisma.pago.count({
      where: { usuarioId, juntaId, tipo: TipoPago.CARTA, vigencia: true },
    });
    if (pagoCartaCount === 0) {
      throw new RequisitosCartaNoCumplidosError(
        'No existe pago tipo CARTA vigente. Debe pagar la carta antes de solicitarla.',
      );
    }

    const requisitos = await this.prisma.requisitoTipo.findMany({
      where: { juntaId, activo: true },
      include: {
        estados: { where: { usuarioId }, take: 1 },
      },
    });
    for (const rt of requisitos) {
      const estado = rt.estados[0];
      const obligacionActiva = estado?.obligacionActiva ?? true;
      const estadoVal = (estado?.estado ?? 'MORA') as string;
      if (obligacionActiva && estadoVal !== 'AL_DIA') {
        throw new RequisitosCartaNoCumplidosError(
          `Requisito "${rt.nombre}" debe estar AL_DIA para solicitar carta.`,
        );
      }
    }
  }

  /** Primer usuario ADMIN de la junta. Para emitidaPorId en autovalidación (AFILIADO propio). */
  private async obtenerAdminJunta(juntaId: string): Promise<string> {
    const admin = await this.prisma.usuarioRol.findFirst({
      where: {
        usuario: { juntaId },
        rol: { nombre: RolNombre.ADMIN },
      },
      select: { usuarioId: true },
    });
    if (!admin) {
      throw new RequisitosCartaNoCumplidosError(
        'No hay administrador configurado en la junta. Contacte al soporte.',
      );
    }
    return admin.usuarioId;
  }

  /**
   * Rechazar carta PENDIENTE con motivo opcional.
   * Solo SECRETARIA. Referencia: flujoSolicitudCarta, CHECKLIST_OPERACION §5.1.
   */
  async rechazar(
    cartaId: string,
    juntaId: string,
    motivoRechazo: string | null,
    ejecutadoPorId: string,
  ): Promise<{ id: string; estado: string; motivoRechazo: string | null }> {
    const carta = await this.prisma.carta.findFirst({
      where: { id: cartaId, juntaId },
    });
    if (!carta) {
      throw new CartaNoEncontradaError(cartaId);
    }
    if (carta.estado !== 'PENDIENTE') {
      throw new CartaNoPendienteError(cartaId);
    }

    const actualizada = await this.prisma.carta.update({
      where: { id: cartaId },
      data: {
        estado: 'RECHAZADA',
        motivoRechazo: motivoRechazo ?? null,
      },
    });

    await this.prisma.auditoria.create({
      data: {
        juntaId,
        entidad: 'Carta',
        entidadId: carta.id,
        accion: 'CARTA_RECHAZADA',
        metadata: { motivoRechazo: motivoRechazo ?? null },
        ejecutadoPorId,
      },
    });

    return {
      id: actualizada.id,
      estado: actualizada.estado,
      motivoRechazo: actualizada.motivoRechazo,
    };
  }

  /**
   * Obtener URL firmada para descargar PDF de carta aprobada.
   * AFILIADO: solo propias. ADMIN/SECRETARIA: cualquiera de la junta.
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
      throw new CartaNoEncontradaError(cartaId);
    }
    if (!this.s3.isConfigured()) {
      throw new AlmacenamientoNoConfiguradoError();
    }
    return this.s3.getSignedDownloadUrl(carta.rutaPdf);
  }
}
