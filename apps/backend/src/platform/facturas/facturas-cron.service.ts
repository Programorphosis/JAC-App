import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PlatformFacturasService } from './platform-facturas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RolNombre } from '@prisma/client';

/**
 * Cron día 1 de cada mes: genera facturas mensuales para suscripciones activas.
 * PA-6 – Facturación plataforma.
 */
@Injectable()
export class FacturasCronService {
  constructor(
    private readonly facturas: PlatformFacturasService,
    private readonly prisma: PrismaService,
  ) {}

  @Cron('0 0 1 * *') // Día 1 de cada mes a las 00:00
  async handleFacturasMensuales() {
    const ejecutadoPorId = await this.obtenerUsuarioAuditoria();
    if (!ejecutadoPorId) {
      console.warn(
        '[FacturasCron] No se encontró usuario para auditoría. Facturas mensuales omitidas.',
      );
      return;
    }

    try {
      const resultado = await this.facturas.generarFacturasMensuales(ejecutadoPorId);
      if (resultado.generadas > 0 || resultado.errores.length > 0) {
        console.log(
          `[FacturasCron] Generadas: ${resultado.generadas}, omitidas: ${resultado.omitidas}`,
        );
        if (resultado.errores.length > 0) {
          console.error('[FacturasCron] Errores:', resultado.errores);
        }
      }
    } catch (err) {
      console.error('[FacturasCron] Error en facturas mensuales:', err);
    }
  }

  @Cron('0 0 2 * * *') // Día 2 de cada mes a las 00:00 (después de generar)
  async handleMarcarVencidas() {
    try {
      const count = await this.facturas.marcarFacturasVencidas();
      if (count > 0) {
        console.log(`[FacturasCron] ${count} facturas marcadas como vencidas`);
      }
    } catch (err) {
      console.error('[FacturasCron] Error marcando facturas vencidas:', err);
    }
  }

  private async obtenerUsuarioAuditoria(): Promise<string | null> {
    const platformAdmin = await this.prisma.usuario.findFirst({
      where: {
        roles: {
          some: {
            rol: { nombre: RolNombre.PLATFORM_ADMIN },
          },
        },
      },
      select: { id: true },
    });
    return platformAdmin?.id ?? null;
  }
}
