import { Injectable, Inject } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import type {
  IRequisitoRepository,
  EstadoRequisitoActual,
  UsuarioParaCorte,
  RequisitoParaCarta,
} from '../../domain/ports/requisito-repository.port';
import {
  EstadoRequisitoTipo as PrismaEstadoRequisitoTipo,
  TipoCambioRequisito,
} from '@prisma/client';

/** Cliente Prisma o transacción. */
type PrismaClientLike = Pick<
  PrismaService,
  'requisitoTipo' | 'estadoRequisito' | 'historialRequisito'
>;

@Injectable()
export class PrismaRequisitoRepository implements IRequisitoRepository {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaClientLike) {}

  async getEstadoRequisito(
    usuarioId: string,
    requisitoTipoId: string,
    juntaId: string,
  ): Promise<EstadoRequisitoActual | null> {
    const estado = await this.prisma.estadoRequisito.findFirst({
      where: {
        usuarioId,
        requisitoTipoId,
        requisitoTipo: { juntaId },
      },
      select: { estado: true, obligacionActiva: true },
    });
    if (!estado) return null;
    return {
      estado: estado.estado as EstadoRequisitoActual['estado'],
      obligacionActiva: estado.obligacionActiva,
    };
  }

  async getRequisitosParaCarta(
    usuarioId: string,
    juntaId: string,
  ): Promise<RequisitoParaCarta[]> {
    const requisitos = await this.prisma.requisitoTipo.findMany({
      where: { juntaId, activo: true },
      include: {
        estados: {
          where: { usuarioId },
          take: 1,
        },
      },
    });

    return requisitos.map((rt) => {
      const estado = rt.estados[0];
      return {
        requisitoTipoId: rt.id,
        nombre: rt.nombre,
        obligacionActiva: estado?.obligacionActiva ?? true,
        estado: (estado?.estado ?? 'MORA') as RequisitoParaCarta['estado'],
      };
    });
  }

  async updateEstadoRequisitoEstado(
    usuarioId: string,
    requisitoTipoId: string,
    nuevoEstado: PrismaEstadoRequisitoTipo,
  ): Promise<void> {
    await this.prisma.estadoRequisito.upsert({
      where: {
        usuarioId_requisitoTipoId: { usuarioId, requisitoTipoId },
      },
      create: {
        usuarioId,
        requisitoTipoId,
        estado: nuevoEstado,
        obligacionActiva: true,
      },
      update: {
        estado: nuevoEstado,
        fechaUltimoCambio: new Date(),
      },
    });
  }

  async updateEstadoRequisitoObligacion(
    usuarioId: string,
    requisitoTipoId: string,
    obligacionActiva: boolean,
  ): Promise<void> {
    await this.prisma.estadoRequisito.upsert({
      where: {
        usuarioId_requisitoTipoId: { usuarioId, requisitoTipoId },
      },
      create: {
        usuarioId,
        requisitoTipoId,
        estado: PrismaEstadoRequisitoTipo.AL_DIA,
        obligacionActiva,
      },
      update: { obligacionActiva },
    });
  }

  async createHistorialRequisito(data: {
    usuarioId: string;
    requisitoTipoId: string;
    tipoCambio: 'ESTADO' | 'OBLIGACION';
    estadoAnterior?: 'AL_DIA' | 'MORA' | null;
    estadoNuevo?: 'AL_DIA' | 'MORA' | null;
    obligacionAnterior?: boolean | null;
    obligacionNueva?: boolean | null;
    cambiadoPorId?: string | null;
    cambioAutomatico?: boolean;
  }): Promise<void> {
    await this.prisma.historialRequisito.create({
      data: {
        usuarioId: data.usuarioId,
        requisitoTipoId: data.requisitoTipoId,
        tipoCambio: data.tipoCambio as TipoCambioRequisito,
        estadoAnterior: data.estadoAnterior as PrismaEstadoRequisitoTipo | undefined,
        estadoNuevo: data.estadoNuevo as PrismaEstadoRequisitoTipo | undefined,
        obligacionAnterior: data.obligacionAnterior,
        obligacionNueva: data.obligacionNueva,
        cambiadoPorId: data.cambiadoPorId ?? undefined,
        cambioAutomatico: data.cambioAutomatico ?? false,
      },
    });
  }

  async getRequisitosYUsuariosParaCorte(
    juntaId?: string,
  ): Promise<
    Array<{ requisitoTipoId: string; juntaId: string; usuarios: UsuarioParaCorte[] }>
  > {
    const requisitos = await this.prisma.requisitoTipo.findMany({
      where: {
        tieneCorteAutomatico: true,
        activo: true,
        ...(juntaId ? { juntaId } : {}),
      },
      select: { id: true, juntaId: true },
    });

    const result: Array<{
      requisitoTipoId: string;
      juntaId: string;
      usuarios: UsuarioParaCorte[];
    }> = [];

    for (const rt of requisitos) {
      const usuarios = await this.prisma.estadoRequisito.findMany({
        where: {
          requisitoTipoId: rt.id,
          obligacionActiva: true,
          estado: PrismaEstadoRequisitoTipo.AL_DIA,
        },
        select: { usuarioId: true },
      });
      result.push({
        requisitoTipoId: rt.id,
        juntaId: rt.juntaId,
        usuarios: usuarios.map((u) => ({ usuarioId: u.usuarioId })),
      });
    }

    return result;
  }
}
