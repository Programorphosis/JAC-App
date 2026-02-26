import { Controller, Post, UseGuards, Request, Query } from '@nestjs/common';
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

  @Post('generar-overrides-mensuales')
  async generarOverridesMensuales(
    @Request() req: { user: JwtUser },
    @Query('year') year?: string,
    @Query('month') month?: string,
  ) {
    const ahora = new Date();
    const mesAnterior = new Date(ahora.getFullYear(), ahora.getMonth() - 1, 1);
    const mesAno = {
      year: year ? parseInt(year, 10) : mesAnterior.getFullYear(),
      month: month ? parseInt(month, 10) : mesAnterior.getMonth() + 1,
    };
    const resultado = await this.facturas.generarFacturasOverridesMensuales(
      mesAno,
      req.user.id,
    );
    return { data: resultado };
  }
}
