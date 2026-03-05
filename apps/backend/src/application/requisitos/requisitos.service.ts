import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { AuditService } from '../../domain/services/audit.service';
import { RequisitoOperationRunner } from '../../infrastructure/requisito/requisito-operation-runner.service';
import { RolNombre } from '@prisma/client';
import type { JwtUser } from '../../auth/strategies/jwt.strategy';
import type { CreateRequisitoTipoDto } from './dto/create-requisito-tipo.dto';
import type { UpdateRequisitoTipoDto } from './dto/update-requisito-tipo.dto';
import {
  UsuarioNoEncontradoError,
  RequisitoTipoNoEncontradoError,
} from '../../domain/errors';

@Injectable()
export class RequisitosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly runner: RequisitoOperationRunner,
  ) {}

  async listarRequisitos(juntaId: string) {
    const requisitos = await this.prisma.requisitoTipo.findMany({
      where: { juntaId },
      include: {
        modificador: {
          select: { id: true, nombres: true, apellidos: true },
        },
      },
    });
    return requisitos;
  }

  async crearRequisitoTipo(
    dto: CreateRequisitoTipoDto,
    juntaId: string,
    creadoPorId: string,
  ) {
    const created = await this.prisma.requisitoTipo.create({
      data: {
        juntaId,
        nombre: dto.nombre,
        modificadorId: dto.modificadorId ?? null,
        tieneCorteAutomatico: dto.tieneCorteAutomatico ?? true,
      },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'RequisitoTipo',
      entidadId: created.id,
      accion: 'ALTA_REQUISITO_TIPO',
      metadata: {
        nombre: created.nombre,
        tieneCorteAutomatico: created.tieneCorteAutomatico,
      },
      ejecutadoPorId: creadoPorId,
    });

    return created;
  }

  async actualizarRequisitoTipo(
    id: string,
    dto: UpdateRequisitoTipoDto,
    juntaId: string,
    actualizadoPorId: string,
  ) {
    const existente = await this.prisma.requisitoTipo.findFirst({
      where: { id, juntaId },
    });
    if (!existente) {
      throw new RequisitoTipoNoEncontradoError(id);
    }

    const updated = await this.prisma.requisitoTipo.update({
      where: { id },
      data: {
        ...(dto.nombre !== undefined && { nombre: dto.nombre }),
        ...(dto.modificadorId !== undefined && {
          modificadorId: dto.modificadorId ?? null,
        }),
        ...(dto.tieneCorteAutomatico !== undefined && {
          tieneCorteAutomatico: dto.tieneCorteAutomatico,
        }),
        ...(dto.activo !== undefined && { activo: dto.activo }),
      },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'RequisitoTipo',
      entidadId: id,
      accion: 'ACTUALIZACION_REQUISITO_TIPO',
      metadata: { campos: Object.keys(dto) },
      ejecutadoPorId: actualizadoPorId,
    });

    return updated;
  }

  async eliminarRequisitoTipo(
    id: string,
    juntaId: string,
    eliminadoPorId: string,
  ) {
    const existente = await this.prisma.requisitoTipo.findFirst({
      where: { id, juntaId },
    });
    if (!existente) {
      throw new RequisitoTipoNoEncontradoError(id);
    }

    await this.prisma.requisitoTipo.delete({
      where: { id },
    });

    await this.audit.registerEvent({
      juntaId,
      entidad: 'RequisitoTipo',
      entidadId: id,
      accion: 'BAJA_REQUISITO_TIPO',
      metadata: { nombre: existente.nombre },
      ejecutadoPorId: eliminadoPorId,
    });

    return { ok: true };
  }

  private async puedeActualizarEstado(
    user: JwtUser,
    requisitoTipoId: string,
    juntaId: string,
  ): Promise<void> {
    const rt = await this.prisma.requisitoTipo.findFirst({
      where: { id: requisitoTipoId, juntaId },
    });
    if (!rt) {
      throw new RequisitoTipoNoEncontradoError(requisitoTipoId);
    }
    if (rt.modificadorId !== user.id) {
      throw new ForbiddenException(
        'Solo el modificador asignado a este requisito puede actualizar el estado',
      );
    }
  }

  async actualizarEstado(
    usuarioId: string,
    requisitoTipoId: string,
    estado: 'AL_DIA' | 'MORA',
    user: JwtUser,
  ) {
    const juntaId = user.juntaId!;

    await this.puedeActualizarEstado(user, requisitoTipoId, juntaId);

    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
    });
    if (!usuario) {
      throw new UsuarioNoEncontradoError(usuarioId);
    }

    await this.runner.updateEstadoRequisito({
      requisitoTipoId,
      usuarioId,
      juntaId,
      nuevoEstado: estado,
      cambiadoPorId: user.id,
    });
    return {
      data: { ok: true },
      meta: { timestamp: new Date().toISOString() },
    };
  }

  async actualizarObligacion(
    usuarioId: string,
    requisitoTipoId: string,
    obligacionActiva: boolean,
    user: JwtUser,
  ) {
    const juntaId = user.juntaId!;

    if (!user.roles.includes(RolNombre.ADMIN)) {
      throw new ForbiddenException('Solo ADMIN puede cambiar la obligación');
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: { id: usuarioId, juntaId },
    });
    if (!usuario) {
      throw new UsuarioNoEncontradoError(usuarioId);
    }

    const rt = await this.prisma.requisitoTipo.findFirst({
      where: { id: requisitoTipoId, juntaId },
    });
    if (!rt) {
      throw new RequisitoTipoNoEncontradoError(requisitoTipoId);
    }

    await this.runner.updateObligacionRequisito({
      requisitoTipoId,
      usuarioId,
      juntaId,
      obligacionActiva,
      cambiadoPorId: user.id,
    });
    return {
      data: { ok: true },
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
