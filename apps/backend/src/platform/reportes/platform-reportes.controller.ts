import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';
import { PlatformReportesService } from './platform-reportes.service';

/**
 * PA-10: Reportes exportables para platform admin.
 * Retorna { data: string, filename: string }. El frontend genera la descarga.
 */
@Controller('platform/reportes')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformReportesController {
  constructor(private readonly reportes: PlatformReportesService) {}

  @Get('juntas')
  async reporteJuntas() {
    return this.reportes.reporteJuntas();
  }

  @Get('facturacion')
  async reporteFacturacion() {
    return this.reportes.reporteFacturacion();
  }

  @Get('uso')
  async reporteUso() {
    return this.reportes.reporteUso();
  }
}
