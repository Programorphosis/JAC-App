import {
  Controller,
  Post,
  Body,
  Headers,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { PagosService } from '../pagos/pagos.service';
import { PagoDuplicadoError } from '../../domain/errors/domain.errors';
import { ConflictException } from '@nestjs/common';

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
  signature?: {
    properties: string[];
    timestamp: number;
    checksum: string;
  };
}

/**
 * Webhooks externos (Wompi).
 * Sin autenticación JWT: el webhook viene de Wompi.
 * Verificación por firma HMAC con WOMPI_EVENTS_SECRET.
 */
@Controller('webhooks')
export class WebhooksController {
  constructor(private readonly pagos: PagosService) {}

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

    const secret = process.env.WOMPI_EVENTS_SECRET;
    if (!secret) {
      throw new BadRequestException('Webhook no configurado');
    }

    const checksum = headerChecksum || body.signature?.checksum;
    if (!checksum) {
      throw new BadRequestException('Falta checksum del evento');
    }

    const props = body.signature?.properties ?? [
      'transaction.id',
      'transaction.status',
      'transaction.amount_in_cents',
    ];
    const timestamp = body.signature?.timestamp ?? Math.floor(new Date(body.sent_at).getTime() / 1000);

    const values: string[] = [];
    for (const path of props) {
      const v = this.getNestedValue(body.data, path);
      if (v !== undefined && v !== null) {
        values.push(String(v));
      }
    }

    const concatenated = values.join('') + String(timestamp) + secret;
    const calculated = createHash('sha256').update(concatenated).digest('hex').toUpperCase();

    if (calculated !== checksum.toUpperCase()) {
      throw new BadRequestException('Checksum inválido');
    }

    try {
      await this.pagos.registrarPagoDesdeProveedor({
        transactionId: tx.id,
        amountInCents: tx.amount_in_cents,
        paymentLinkId: tx.payment_link_id ?? undefined,
        reference: tx.reference ?? undefined,
      });
    } catch (err) {
      if (err instanceof PagoDuplicadoError) {
        return { received: true };
      }
      throw err;
    }

    return { received: true };
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
