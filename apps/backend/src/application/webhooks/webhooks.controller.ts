import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { SkipThrottle } from '@nestjs/throttler';
import { createHash } from 'crypto';
import { PagosService } from '../pagos/pagos.service';
import { PlatformFacturasService } from '../../platform/facturas/platform-facturas.service';
import { PrismaService } from '../../prisma/prisma.service';
import { EncryptionService } from '../../infrastructure/encryption/encryption.service';
import { PagoDuplicadoError } from '../../domain/errors/domain.errors';

interface WompiEventBody {
  event: string;
  data: {
    transaction?: {
      id: string;
      status: string;
      amount_in_cents: number;
      currency: string;
      reference?: string | null;
      payment_link_id?: string | null;
    };
  };
  sent_at: string;
  /** Wompi envía timestamp en root (docs) o dentro de signature */
  timestamp?: number;
  signature?: {
    properties: string[];
    timestamp?: number;
    checksum: string;
  };
}

/**
 * Webhooks externos (Wompi).
 * Sin autenticación JWT: el webhook viene de Wompi.
 * WOMPI_POR_JUNTA_DOC §4.2: validación por wompiEventsSecret de la junta.
 * FACTURACION_PLATAFORMA_PAGO_ONLINE_ANALISIS.md: rama facturas con WOMPI_EVENTS_SECRET.
 */
@Controller('webhooks')
@SkipThrottle() // Wompi envía webhooks; no aplicar rate limit
export class WebhooksController {
  constructor(
    private readonly pagos: PagosService,
    private readonly facturas: PlatformFacturasService,
    private readonly prisma: PrismaService,
    private readonly encryption: EncryptionService,
  ) {}

  @Post('wompi')
  @HttpCode(HttpStatus.OK)
  async wompi(
    @Body() body: WompiEventBody,
    @Headers('x-event-checksum') headerChecksum: string,
  ) {
    if (body.event !== 'transaction.updated') {
      return { received: true };
    }

    const tx = body.data?.transaction;
    if (!tx) {
      return { received: true };
    }

    if (tx.status !== 'APPROVED') {
      return { received: true };
    }

    const paymentLinkId = tx.payment_link_id ?? null;
    if (!paymentLinkId) {
      return { received: true };
    }

    const intencion = await this.prisma.intencionPago.findUnique({
      where: { wompiLinkId: paymentLinkId },
      select: { juntaId: true },
    });

    if (intencion) {
      // Rama pagos junta (afiliados → junta)
      const junta = await this.prisma.junta.findUnique({
        where: { id: intencion.juntaId },
        select: { wompiEventsSecret: true },
      });
      if (!junta?.wompiEventsSecret) {
        throw new BadRequestException('Junta sin webhook configurado');
      }

      const secret = this.encryption.decrypt(junta.wompiEventsSecret);
      this.validarChecksumWompi(body, headerChecksum, secret);

      try {
        await this.pagos.registrarPagoDesdeProveedor({
          transactionId: tx.id,
          amountInCents: tx.amount_in_cents,
          paymentLinkId: tx.payment_link_id ?? undefined,
          reference: tx.reference ?? undefined,
        });
      } catch (err) {
        const esDuplicado =
          err instanceof PagoDuplicadoError ||
          (err instanceof Error &&
            (err as Error & { code?: string }).code === 'PAGO_DUPLICADO');
        if (esDuplicado) return { received: true };
        throw err;
      }
      return { received: true };
    }

    // Rama facturación plataforma (junta → plataforma)
    const intencionFactura = await this.prisma.intencionPagoFactura.findUnique({
      where: { wompiLinkId: paymentLinkId },
    });
    if (intencionFactura) {
      const secret = process.env.WOMPI_EVENTS_SECRET;
      if (!secret) {
        throw new BadRequestException(
          'Plataforma sin WOMPI_EVENTS_SECRET configurado',
        );
      }
      this.validarChecksumWompi(body, headerChecksum, secret);

      await this.facturas.registrarPagoDesdeProveedorFactura({
        transactionId: tx.id,
        amountInCents: tx.amount_in_cents,
        paymentLinkId,
      });
      return { received: true };
    }

    return { received: true };
  }

  private validarChecksumWompi(
    body: WompiEventBody,
    headerChecksum: string,
    secret: string,
  ): void {
    const checksum = headerChecksum || body.signature?.checksum;
    if (!checksum) {
      throw new BadRequestException('Falta checksum del evento');
    }

    const props = body.signature?.properties ?? [
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ];
    const rawTs =
      body.timestamp ??
      body.signature?.timestamp ??
      Math.floor(new Date(body.sent_at).getTime() / 1000);
    const timestamp = rawTs > 1e12 ? Math.floor(rawTs / 1000) : rawTs;

    const values: string[] = [];
    for (const path of props) {
      const v = this.getNestedValue(body.data, path);
      if (v !== undefined && v !== null) {
        values.push(String(v as string | number));
      }
    }

    const concatenated = values.join('') + String(timestamp) + secret;
    const calculated = createHash('sha256')
      .update(concatenated)
      .digest('hex')
      .toUpperCase();

    if (calculated !== checksum.toUpperCase()) {
      throw new BadRequestException('Checksum inválido');
    }
  }

  private getNestedValue(obj: unknown, path: string): unknown {
    const parts = path.split('.');
    let current: unknown = obj;
    for (const p of parts) {
      if (current !== null && typeof current === 'object' && p in current) {
        current = (current as Record<string, unknown>)[p];
      } else {
        return undefined;
      }
    }
    return current;
  }
}
