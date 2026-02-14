import { Injectable } from '@nestjs/common';

export interface CrearPaymentLinkParams {
  name: string;
  description: string;
  amountInCents: number;
  currency: string;
  singleUse: boolean;
  redirectUrl?: string;
  sku?: string;
}

interface WompiPaymentLinkResponse {
  data: {
    id: string;
    name: string;
    description: string;
    single_use: boolean;
    currency: string;
    amount_in_cents: number | null;
    sku: string | null;
    redirect_url: string | null;
    active: boolean;
  };
}

/**
 * Cliente HTTP para la API de Wompi (recibir pagos).
 * Referencia: docs.wompi.co, WOMPI_VARIABLES_ENTORNO.md
 */
@Injectable()
export class WompiService {
  private readonly baseUrl: string;
  private readonly privateKey: string;

  constructor() {
    const env = process.env.WOMPI_ENVIRONMENT || 'sandbox';
    this.baseUrl =
      env === 'production'
        ? 'https://production.wompi.co/v1'
        : 'https://sandbox.wompi.co/v1';
    this.privateKey = process.env.WOMPI_PRIVATE_KEY || '';
  }

  async crearPaymentLink(params: CrearPaymentLinkParams): Promise<{ id: string }> {
    const body = {
      name: params.name,
      description: params.description,
      amount_in_cents: params.amountInCents,
      currency: params.currency,
      single_use: params.singleUse,
      collect_shipping: false,
      redirect_url: params.redirectUrl ?? null,
      sku: params.sku ?? null,
    };

    const res = await fetch(`${this.baseUrl}/payment_links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.privateKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`Wompi API error ${res.status}: ${text}`);
    }

    const json = (await res.json()) as WompiPaymentLinkResponse;
    return { id: json.data.id };
  }

  /**
   * Consulta una transacción por ID (para rescate al retorno).
   */
  async obtenerTransaccion(transactionId: string): Promise<{
    id: string;
    status: string;
    amount_in_cents: number;
    currency: string;
    reference?: string;
    payment_link_id?: string;
  } | null> {
    try {
      const res = await fetch(
        `${this.baseUrl}/transactions/${transactionId}`,
        {
          headers: {
            Authorization: `Bearer ${this.privateKey}`,
          },
        },
      );

      if (!res.ok) return null;

      const json = (await res.json()) as { data: unknown };
      return json.data as {
        id: string;
        status: string;
        amount_in_cents: number;
        currency: string;
        reference?: string;
        payment_link_id?: string;
      };
    } catch {
      return null;
    }
  }
}
