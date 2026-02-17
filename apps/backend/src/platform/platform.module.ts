import { Module } from '@nestjs/common';
import { PlatformJuntasController } from './juntas/platform-juntas.controller';
import { PlatformJuntasService } from './juntas/platform-juntas.service';
import { PlatformAuditoriaController } from './auditoria/platform-auditoria.controller';
import { PlatformAuditoriaService } from './auditoria/platform-auditoria.service';
import { PlatformDashboardController } from './dashboard/platform-dashboard.controller';
import { PlatformDashboardService } from './dashboard/platform-dashboard.service';
import { PlatformPlanesController } from './planes/platform-planes.controller';
import { PlatformPlanesService } from './planes/platform-planes.service';
import { PlatformFacturasController } from './facturas/platform-facturas.controller';
import { PlatformFacturasJobController } from './facturas/platform-facturas-job.controller';
import { PlatformFacturasPublicController } from './facturas/platform-facturas-public.controller';
import { PlatformFacturasService } from './facturas/platform-facturas.service';
import { FacturasCronService } from './facturas/facturas-cron.service';
import { PlatformOperacionesController } from './operaciones/platform-operaciones.controller';
import { PlatformOperacionesService } from './operaciones/platform-operaciones.service';
import { PlatformImpersonacionController } from './impersonacion/platform-impersonacion.controller';
import { PlatformAvisosController } from './avisos/platform-avisos.controller';
import { PlatformAvisosPublicController } from './avisos/platform-avisos-public.controller';
import { PlatformAvisosService } from './avisos/platform-avisos.service';
import { PlatformReportesController } from './reportes/platform-reportes.controller';
import { PlatformReportesService } from './reportes/platform-reportes.service';
import { JuntaModule } from '../application/junta/junta.module';
import { AuditModule } from '../infrastructure/audit/audit.module';
import { LimitesModule } from '../infrastructure/limits/limites.module';
import { WompiModule } from '../infrastructure/wompi/wompi.module';
import { AuthModule } from '../auth/auth.module';

/**
 * Módulo Platform Admin – autocontenido para futura migración.
 * Rutas: /api/platform/juntas, /api/platform/auditoria, /api/platform/dashboard, /api/platform/facturas
 * Dependencias: JuntaModule, AuditModule, WompiModule (pago online facturas)
 */
@Module({
  imports: [JuntaModule, AuditModule, LimitesModule, WompiModule, AuthModule],
  controllers: [
    PlatformJuntasController,
    PlatformAuditoriaController,
    PlatformDashboardController,
    PlatformPlanesController,
    PlatformFacturasController,
    PlatformFacturasJobController,
    PlatformFacturasPublicController,
    PlatformOperacionesController,
    PlatformImpersonacionController,
    PlatformAvisosController,
    PlatformAvisosPublicController,
    PlatformReportesController,
  ],
  providers: [
    PlatformJuntasService,
    PlatformAuditoriaService,
    PlatformDashboardService,
    PlatformPlanesService,
    PlatformFacturasService,
    FacturasCronService,
    PlatformOperacionesService,
    PlatformAvisosService,
    PlatformReportesService,
  ],
  exports: [PlatformFacturasService],
})
export class PlatformModule {}
