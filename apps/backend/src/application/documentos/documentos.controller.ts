/**
 * Módulo de documentos - subida a S3.
 * Referencia: flujoDocumentos.md
 */
import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { AuthGuard } from '@nestjs/passport';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { PermissionService } from '../../auth/permission.service';
import { DocumentosService } from './documentos.service';
import type { MulterFile } from './types';
import { memoryStorage } from 'multer';

const storage = memoryStorage();

@Controller('documentos')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class DocumentosController {
  constructor(
    private readonly documentos: DocumentosService,
    private readonly permissions: PermissionService,
  ) {}

  /**
   * POST /documentos - Subir documento (multipart/form-data).
   * Campos: usuarioId, tipo (RECIBO_AGUA | SOPORTE_CARTA), file
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA, RolNombre.CIUDADANO)
  @UseInterceptors(
    FileInterceptor('file', {
      storage,
      limits: { fileSize: 5 * 1024 * 1024 },
    }),
  )
  async subir(
    @Body('usuarioId') usuarioId: string,
    @Body('tipo') tipo: string,
    @UploadedFile() file: MulterFile | undefined,
    @Request() req: { user: JwtUser },
  ) {
    if (!usuarioId?.trim() || !tipo?.trim()) {
      throw new BadRequestException('usuarioId y tipo son requeridos');
    }
    if (!file) {
      throw new BadRequestException('El archivo es requerido');
    }

    const user = req.user;
    const juntaId = user.juntaId!;

    if (!this.permissions.puedeSubirDocumentoParaOtro(user) && usuarioId !== user.id) {
      throw new ForbiddenException('Solo puede subir documentos propios');
    }

    const data = await this.documentos.subir({
      usuarioId: usuarioId.trim(),
      juntaId,
      tipo: tipo.trim(),
      file,
      subidoPorId: user.id,
    });

    return {
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  /**
   * GET /documentos/:id/descargar - Obtener URL firmada para descargar.
   */
  @Get(':id/descargar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.CIUDADANO)
  async descargar(
    @Param('id') id: string,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const user = req.user;

    const soloPropios = this.permissions.puedeVerDocumentosDeOtro(user) ? undefined : user.id;
    const url = await this.documentos.getUrlDescarga(id, juntaId, soloPropios);
    return { data: { url } };
  }
}
