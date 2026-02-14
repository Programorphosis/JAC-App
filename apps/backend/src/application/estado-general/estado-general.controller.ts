/**
 * Estado general del usuario para solicitud de carta.
 * Referencia: flujoSolicitudCarta.md, ROADMAP Fase 7
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
import { EstadoGeneralService } from './estado-general.service';
import { UsuarioNoEncontradoError } from '../../domain/errors/domain.errors';
import { NotFoundException } from '@nestjs/common';

@Controller('usuarios/:usuarioId/estado-general')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class EstadoGeneralController {
  constructor(private readonly estadoGeneral: EstadoGeneralService) {}

  /**
   * GET /usuarios/:usuarioId/estado-general
   * Calcula: deuda junta, requisitos adicionales, existencia pago CARTA.
   * ADMIN, SECRETARIA, TESORERA: cualquier usuario de la junta.
   * CIUDADANO: solo sí mismo.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.CIUDADANO)
  async obtener(
    @Param('usuarioId') usuarioId: string,
    @Request() req: { user: JwtUser },
  ) {
    const user = req.user;
    const juntaId = user.juntaId!;

    const puedeConsultarOtro =
      user.roles.includes(RolNombre.ADMIN) ||
      user.roles.includes(RolNombre.SECRETARIA) ||
      user.roles.includes(RolNombre.TESORERA);

    if (!puedeConsultarOtro && usuarioId !== user.id) {
      throw new ForbiddenException('Solo puede consultar su propio estado');
    }

    try {
      const data = await this.estadoGeneral.getEstadoGeneral(usuarioId, juntaId);
      return {
        data,
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (err) {
      if (err instanceof UsuarioNoEncontradoError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }
}
