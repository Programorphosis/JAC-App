/**
 * Endpoint para listar documentos de un usuario.
 * Referencia: flujoDocumentos.md - GET /api/usuarios/:id/documentos
 */
import {
  Controller,
  Get,
  Param,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { DocumentosService } from './documentos.service';

@Controller('usuarios/:usuarioId/documentos')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class DocumentosUsuarioController {
  constructor(private readonly documentos: DocumentosService) {}

  /**
   * GET /usuarios/:usuarioId/documentos - Listar documentos de un usuario.
   * ADMIN, SECRETARIA, TESORERA: cualquier usuario de la junta.
   * CIUDADANO: solo propios.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.CIUDADANO)
  async listar(
    @Param('usuarioId') usuarioId: string,
    @Request() req: { user: JwtUser },
  ) {
    const user = req.user;
    const juntaId = user.juntaId!;

    const puedeVerOtro =
      user.roles.includes(RolNombre.ADMIN) ||
      user.roles.includes(RolNombre.SECRETARIA) ||
      user.roles.includes(RolNombre.TESORERA) ||
      (user.esModificador && !!user.juntaId);

    if (!puedeVerOtro && usuarioId !== user.id) {
      throw new ForbiddenException('Solo puede listar sus propios documentos');
    }

    const soloPropios = puedeVerOtro ? undefined : user.id;
    const data = await this.documentos.listarPorUsuario(
      usuarioId,
      juntaId,
      soloPropios,
    );
    return {
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
