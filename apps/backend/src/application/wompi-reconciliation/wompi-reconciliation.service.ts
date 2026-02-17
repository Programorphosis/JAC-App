import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { PagosService } from '../pagos/pagos.service';
import { PlatformFacturasService } from '../../platform/facturas/platform-facturas.service';
import { WompiService } from '../../infrastructure/wompi/wompi.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import { PagoDuplicadoError } from '../../domain/errors';

/** Resultado de una ejecución de reconciliación. */
export interface WompiReconciliationResult {
  registradosJunta: number;
  registradosFacturas: number;
  errores: string[];
  intencionesRevisadas: number;
  intencionesFacturaRevisadas: number;
}

/**
 * Job de reconciliación Wompi.
 * Compara transacciones APPROVED en Wompi vs pagos en BD; registra las faltantes.
 * Referencia: flujoDePagosCasoFallaWebhook.md, consecutivosYCronJobs.md
 *
 * Estrategia: Para cada IntencionPago/IntencionPagoFactura de los últimos N días sin
 * pago registrado, consulta el payment link en Wompi. Si la API devuelve transacciones
 * APPROVED, intenta registrar con la misma lógica que webhook y retorno (idempotente).
 */
@Injectable()
export class WompiReconciliationService {
  private readonly DIAS_ATRAS = 7;

  constructor(
    private readonly prisma: PrismaService,
    private readonly pagos: PagosService,
    private readonly facturas: PlatformFacturasService,
    private readonly wompi: WompiService,
    private readonly encryption: EncryptionService,
  ) {}

  /**
   * Ejecuta la reconciliación para pagos junta (afiliados → junta) y facturas plataforma.
   */
  async ejecutar(): Promise<WompiReconciliationResult> {
    const result: WompiReconciliationResult = {
      registradosJunta: 0,
      registradosFacturas: 0,
      errores: [],
      intencionesRevisadas: 0,
      intencionesFacturaRevisadas: 0,
    };

    const desde = new Date();
    desde.setDate(desde.getDate() - this.DIAS_ATRAS);
    desde.setHours(0, 0, 0, 0);

    // 1. Reconciliación pagos junta (por cada junta con Wompi)
    const juntasConWompi = await this.prisma.junta.findMany({
      where: { wompiPrivateKey: { not: null } },
      select: { id: true },
    });

    for (const junta of juntasConWompi) {
      const intenciones = await this.prisma.intencionPago.findMany({
        where: {
          juntaId: junta.id,
          fechaCreacion: { gte: desde },
        },
        select: {
          id: true,
          wompiLinkId: true,
          montoCents: true,
          juntaId: true,
        },
      });

      for (const intencion of intenciones) {
        result.intencionesRevisadas++;

        const creds = await this.obtenerCredencialesJunta(intencion.juntaId);
        if (!creds) continue;

        const link = await this.wompi.obtenerPaymentLink(intencion.wompiLinkId, creds);
        if (!link?.transactions?.length) continue;

        const approved = link.transactions.filter((t) => t.status === 'APPROVED');
        for (const tx of approved) {
          const yaExiste = await this.prisma.pago.findUnique({
            where: { referenciaExterna: tx.id },
          });
          if (yaExiste) continue;

          try {
            await this.pagos.registrarPagoDesdeProveedor({
              transactionId: tx.id,
              amountInCents: tx.amount_in_cents,
              paymentLinkId: intencion.wompiLinkId,
              reference: tx.reference ?? undefined,
            });
            result.registradosJunta++;
          } catch (err) {
            if (err instanceof PagoDuplicadoError) {
              // Idempotencia: ya estaba registrado
              continue;
            }
            result.errores.push(
              `Intención ${intencion.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    }

    // 2. Reconciliación facturas plataforma (credenciales env)
    const intencionesFactura = await this.prisma.intencionPagoFactura.findMany({
      where: { fechaCreacion: { gte: desde } },
      select: {
        id: true,
        wompiLinkId: true,
        montoCents: true,
        facturaId: true,
        juntaId: true,
      },
    });

    const credsPlataforma = this.wompiCredencialesPlataforma();
    if (credsPlataforma) {
      for (const intencion of intencionesFactura) {
        result.intencionesFacturaRevisadas++;

        const factura = await this.prisma.factura.findUnique({
          where: { id: intencion.facturaId },
          include: { pagos: true },
        });
        if (!factura) continue;

        const link = await this.wompi.obtenerPaymentLink(intencion.wompiLinkId, credsPlataforma);
        if (!link?.transactions?.length) continue;

        const approved = link.transactions.filter((t) => t.status === 'APPROVED');
        for (const tx of approved) {
          const yaExiste = factura.pagos.some((p) => p.referenciaExterna === tx.id);
          if (yaExiste) continue;

          try {
            await this.facturas.registrarPagoDesdeProveedorFactura({
              transactionId: tx.id,
              amountInCents: tx.amount_in_cents,
              paymentLinkId: intencion.wompiLinkId,
            });
            result.registradosFacturas++;
          } catch (err) {
            if (err instanceof PagoDuplicadoError) continue;
            result.errores.push(
              `Intención factura ${intencion.id}: ${err instanceof Error ? err.message : String(err)}`,
            );
          }
        }
      }
    }

    return result;
  }

  private async obtenerCredencialesJunta(
    juntaId: string,
  ): Promise<{ privateKey: string; environment: 'sandbox' | 'production' } | null> {
    const junta = await this.prisma.junta.findUnique({
      where: { id: juntaId },
      select: { wompiPrivateKey: true, wompiEnvironment: true },
    });
    if (!junta?.wompiPrivateKey) return null;

    const privateKey = this.encryption.decrypt(junta.wompiPrivateKey);
    const environment = (junta.wompiEnvironment || 'sandbox') as 'sandbox' | 'production';
    return { privateKey, environment };
  }

  private wompiCredencialesPlataforma(): {
    privateKey: string;
    environment: 'sandbox' | 'production';
  } | null {
    const key = process.env.WOMPI_PRIVATE_KEY;
    if (!key) return null;
    const env = process.env.WOMPI_ENVIRONMENT || 'sandbox';
    return {
      privateKey: key,
      environment: env === 'production' ? 'production' : 'sandbox',
    };
  }
}
