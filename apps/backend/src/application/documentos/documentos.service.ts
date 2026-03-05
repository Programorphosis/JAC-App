/**
 * Servicio de documentos - subida a S3 y registro en BD.
 * Referencia: flujoDocumentos.md
 */
import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { S3StorageService } from '../../infrastructure/storage/s3-storage.service';
import { LimitesService } from '../../infrastructure/limits/limites.service';
import type { MulterFile } from './types';
import { randomUUID } from 'crypto';
import {
  UsuarioNoEncontradoError,
  AlmacenamientoNoConfiguradoError,
  TipoDocumentoNoPermitidoError,
  DocumentoNoEncontradoError,
} from '../../domain/errors';

const TIPOS_PERMITIDOS = ['RECIBO_AGUA', 'SOPORTE_CARTA'];

export interface SubirDocumentoParams {
  usuarioId: string;
  juntaId: string;
  tipo: string;
  file: MulterFile;
  subidoPorId: string;
}

@Injectable()
export class DocumentosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly s3: S3StorageService,
    private readonly limites: LimitesService,
  ) {}

  async subir(params: SubirDocumentoParams): Promise<{
    id: string;
    tipo: string;
    rutaS3: string;
    fechaSubida: Date;
  }> {
    if (!this.s3.isConfigured()) {
      throw new AlmacenamientoNoConfiguradoError();
    }

    if (!TIPOS_PERMITIDOS.includes(params.tipo)) {
      throw new TipoDocumentoNoPermitidoError(params.tipo);
    }

    const usuario = await this.prisma.usuario.findFirst({
      where: { id: params.usuarioId, juntaId: params.juntaId },
    });
    if (!usuario) {
      throw new UsuarioNoEncontradoError(params.usuarioId);
    }

    this.s3.validateFile(params.file);

    const sizeBytes = params.file.buffer.byteLength ?? params.file.size ?? 0;
    await this.limites.validarStorage(params.juntaId, sizeBytes);

    const ext = this.getExtension(params.file.originalname);
    // Estructura: documentos/{juntaId}/{userId}/{tipo}/{uuid}.{ext}
    const key = `documentos/${params.juntaId}/${params.usuarioId}/${params.tipo}/${randomUUID()}${ext}`;

    await this.s3.upload({
      key,
      body: params.file.buffer,
      contentType: params.file.mimetype,
    });

    const doc = await this.prisma.documento.create({
      data: {
        usuarioId: params.usuarioId,
        tipo: params.tipo,
        rutaS3: key,
        sizeBytes: sizeBytes > 0 ? BigInt(sizeBytes) : null,
        subidoPorId: params.subidoPorId,
      },
    });

    await this.prisma.auditoria.create({
      data: {
        juntaId: params.juntaId,
        entidad: 'Documento',
        entidadId: doc.id,
        accion: 'SUBIDA_DOCUMENTO',
        metadata: {
          usuarioId: params.usuarioId,
          tipo: params.tipo,
          rutaS3: key,
        },
        ejecutadoPorId: params.subidoPorId,
      },
    });

    return {
      id: doc.id,
      tipo: doc.tipo,
      rutaS3: doc.rutaS3,
      fechaSubida: doc.fechaSubida,
    };
  }

  private getExtension(filename: string): string {
    const match = filename.match(/\.([a-zA-Z0-9]+)$/);
    return match ? `.${match[1].toLowerCase()}` : '';
  }

  async listarPorUsuario(
    usuarioId: string,
    juntaId: string,
    soloPropios?: string,
  ): Promise<
    { id: string; tipo: string; rutaS3: string; fechaSubida: Date }[]
  > {
    const docs = await this.prisma.documento.findMany({
      where: {
        usuarioId,
        usuario: {
          juntaId,
          ...(soloPropios ? { id: soloPropios } : {}),
        },
      },
      orderBy: { fechaSubida: 'desc' },
      select: {
        id: true,
        tipo: true,
        rutaS3: true,
        fechaSubida: true,
      },
    });
    return docs;
  }

  async getUrlDescarga(
    documentoId: string,
    juntaId: string,
    soloPropios?: string,
  ): Promise<string> {
    const doc = await this.prisma.documento.findFirst({
      where: {
        id: documentoId,
        usuario: {
          juntaId,
          ...(soloPropios ? { id: soloPropios } : {}),
        },
      },
    });
    if (!doc) {
      throw new DocumentoNoEncontradoError();
    }
    return this.s3.getSignedDownloadUrl(doc.rutaS3);
  }
}
