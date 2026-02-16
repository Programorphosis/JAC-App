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
import { PermissionService } from '../../auth/permission.service';
import { EstadoGeneralService } from './estado-general.service';

@Controller('usuarios/:usuarioId/estado-general')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class EstadoGeneralController {
  constructor(
    private readonly estadoGeneral: EstadoGeneralService,
    private readonly permissions: PermissionService,
  ) {}

  /**
   * GET /usuarios/:usuarioId/estado-general
   * Calcula: deuda junta, requisitos adicionales, existencia pago CARTA.
   * ADMIN, SECRETARIA, TESORERA: cualquier usuario de la junta.
   * AFILIADO, RECEPTOR_AGUA (modificador): si puedeConsultarRecursoDeOtro.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.AFILIADO, RolNombre.RECEPTOR_AGUA)
  async obtener(
    @Param('usuarioId') usuarioId: string,
    @Request() req: { user: JwtUser },
  ) {
    const user = req.user;
    const juntaId = user.juntaId!;

    if (!this.permissions.puedeConsultarRecursoDeOtro(user) && usuarioId !== user.id) {
      throw new ForbiddenException('Solo puede consultar su propio estado');
    }

    const data = await this.estadoGeneral.getEstadoGeneral(usuarioId, juntaId, {
      id: user.id,
      roles: user.roles,
    });
    return {
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
