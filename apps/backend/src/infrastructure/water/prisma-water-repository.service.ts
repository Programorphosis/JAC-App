import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  IWaterRepository,
  EstadoAguaActual,
  UsuarioParaCorte,
} from '../../domain/ports/water-repository.port';
import { EstadoAguaTipo as PrismaEstadoAguaTipo, TipoCambioAgua } from '@prisma/client';
import type { EstadoAguaTipo } from '../../domain/types/water.types';

/** Cliente Prisma o transacción. */
type PrismaClientLike = Pick<
  PrismaService,
  'estadoAgua' | 'historialAgua'
>;

@Injectable()
export class PrismaWaterRepository implements IWaterRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaClientLike) {}

  async getEstadoAgua(usuarioId: string, juntaId: string): Promise<EstadoAguaActual | null> {
    const estado = await this.prisma.estadoAgua.findFirst({
      where: {
        usuarioId,
        usuario: { juntaId },
      },
      select: { estado: true, obligacionActiva: true },
    });
    if (!estado) return null;
    return {
      estado: estado.estado as EstadoAguaTipo,
      obligacionActiva: estado.obligacionActiva,
    };
  }

  async updateEstadoAguaEstado(usuarioId: string, nuevoEstado: EstadoAguaTipo): Promise<void> {
    await this.prisma.estadoAgua.update({
      where: { usuarioId },
      data: {
        estado: nuevoEstado as PrismaEstadoAguaTipo,
        fechaUltimoCambio: new Date(),
      },
    });
  }

  async updateEstadoAguaObligacion(
    usuarioId: string,
    obligacionActiva: boolean,
  ): Promise<void> {
    await this.prisma.estadoAgua.update({
      where: { usuarioId },
      data: { obligacionActiva },
    });
  }

  async createHistorialAgua(data: {
    usuarioId: string;
    tipoCambio: 'ESTADO' | 'OBLIGACION';
    estadoAnterior?: EstadoAguaTipo | null;
    estadoNuevo?: EstadoAguaTipo | null;
    obligacionAnterior?: boolean | null;
    obligacionNueva?: boolean | null;
    cambiadoPorId?: string | null;
    cambioAutomatico?: boolean;
  }): Promise<void> {
    await this.prisma.historialAgua.create({
      data: {
        usuarioId: data.usuarioId,
        tipoCambio: data.tipoCambio as TipoCambioAgua,
        estadoAnterior: data.estadoAnterior as PrismaEstadoAguaTipo | undefined,
        estadoNuevo: data.estadoNuevo as PrismaEstadoAguaTipo | undefined,
        obligacionAnterior: data.obligacionAnterior,
        obligacionNueva: data.obligacionNueva,
        cambiadoPorId: data.cambiadoPorId ?? undefined,
        cambioAutomatico: data.cambioAutomatico ?? false,
      },
    });
  }

  async getUsuariosParaCorteMensual(juntaId: string): Promise<UsuarioParaCorte[]> {
    const usuarios = await this.prisma.estadoAgua.findMany({
      where: {
        usuario: { juntaId },
        obligacionActiva: true,
        estado: PrismaEstadoAguaTipo.AL_DIA,
      },
      select: { usuarioId: true },
    });
    return usuarios;
  }
}
