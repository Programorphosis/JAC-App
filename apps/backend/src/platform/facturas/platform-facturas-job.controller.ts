import { Controller, Post, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformFacturasService } from './platform-facturas.service';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';
import { JwtUser } from '../../auth/strategies/jwt.strategy';

/**
 * Endpoints de jobs de facturación (ejecución manual).
 * El cron corre automáticamente el día 1 de cada mes.
 */
@Controller('platform/facturas')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformFacturasJobController {
  constructor(private readonly facturas: PlatformFacturasService) {}

  @Post('generar-mensuales')
  async generarMensuales(@Request() req: { user: JwtUser }) {
    const resultado = await this.facturas.generarFacturasMensuales(req.user.id);
    return { data: resultado };
  }
}
