import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { WompiReconciliationService } from './wompi-reconciliation.service';

/**
 * Cron nocturno: reconciliación Wompi.
 * Compara transacciones APPROVED en Wompi vs pagos en BD; registra las faltantes.
 * Referencia: flujoDePagosCasoFallaWebhook.md, consecutivosYCronJobs.md
 */
@Injectable()
export class WompiReconciliationCronService {
  constructor(private readonly reconciliation: WompiReconciliationService) {}

  @Cron('0 2 * * *') // Todos los días a las 02:00
  async handleReconciliation() {
    try {
      const result = await this.reconciliation.ejecutar();
      if (
        result.registradosJunta > 0 ||
        result.registradosFacturas > 0 ||
        result.errores.length > 0
      ) {
        console.log(
          `[WompiReconciliation] Registrados junta: ${result.registradosJunta}, ` +
            `facturas: ${result.registradosFacturas}, ` +
            `revisadas: ${result.intencionesRevisadas} junta / ${result.intencionesFacturaRevisadas} facturas`,
        );
        if (result.errores.length > 0) {
          console.warn('[WompiReconciliation] Errores:', result.errores);
        }
      }
    } catch (err) {
      console.error('[WompiReconciliation] Error en job:', err);
    }
  }
}
