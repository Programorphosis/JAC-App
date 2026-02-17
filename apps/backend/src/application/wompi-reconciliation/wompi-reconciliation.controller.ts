import { Controller, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { WompiReconciliationService } from './wompi-reconciliation.service';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';

/**
 * Endpoint interno para ejecutar reconciliación manualmente (pruebas, rescate).
 * Solo PLATFORM_ADMIN.
 * El cron la ejecuta automáticamente a las 02:00.
 */
@Controller('internal/wompi-reconcile')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class WompiReconciliationController {
  constructor(private readonly reconciliation: WompiReconciliationService) {}

  @Post()
  async ejecutar() {
    const result = await this.reconciliation.ejecutar();
    return {
      data: result,
      mensaje:
        `Reconciliación completada. Registrados junta: ${result.registradosJunta}, ` +
        `facturas: ${result.registradosFacturas}. Revisadas: ${result.intencionesRevisadas} / ${result.intencionesFacturaRevisadas}.`,
    };
  }
}
