import { Controller, Get, Query, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { RolNombre } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { PlatformFacturasService } from './platform-facturas.service';
import { EstadoFactura } from '@prisma/client';

/**
 * Facturas de la plataforma vistas por la junta (admin, tesorera, secretaria).
 * GET /api/facturas-plataforma – lista facturas pendientes/vencidas de la junta del usuario.
 * Solo ADMIN, SECRETARIA, TESORERA. Requiere juntaId en JWT.
 */
@Controller('facturas-plataforma')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA)
export class PlatformFacturasPublicController {
  constructor(private readonly facturas: PlatformFacturasService) {}

  @Get()
  async listarFacturas(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: EstadoFactura,
  ) {
    const user = req.user as JwtUser;
    if (!user.juntaId) {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.facturas.listarFacturas(user.juntaId, p, l, estado);
  }

  @Get('pendientes')
  async listarPendientes(@Req() req: Request) {
    const user = req.user as JwtUser;
    if (!user.juntaId) {
      return { data: [] };
    }
    return this.facturas.listarFacturasPendientes(user.juntaId);
  }
}
