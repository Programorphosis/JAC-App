import { Injectable } from '@nestjs/common';
import type { WompiCredenciales } from './wompi.types';

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

function getBaseUrl(env: string): string {
  return env === 'production'
    ? 'https://production.wompi.co/v1'
    : 'https://sandbox.wompi.co/v1';
}

/**
 * Cliente HTTP para la API de Wompi (recibir pagos).
 * WOMPI_POR_JUNTA_DOC: credenciales por llamada; fallback a env para transición.
 */
@Injectable()
export class WompiService {
  /**
   * Obtiene credenciales desde parámetro o env (fallback para facturación plataforma).
   */
  private credencialesDesdeEnv(): WompiCredenciales {
    const env = process.env.WOMPI_ENVIRONMENT || 'sandbox';
    const privateKey = process.env.WOMPI_PRIVATE_KEY || '';
    return {
      privateKey,
      environment: env === 'production' ? 'production' : 'sandbox',
    };
  }

  /**
   * Crea payment link en Wompi.
   * Si credenciales no se pasan, usa env (fallback).
   */
  async crearPaymentLink(
    params: CrearPaymentLinkParams,
    credenciales?: WompiCredenciales,
  ): Promise<{ id: string }> {
    const creds = credenciales ?? this.credencialesDesdeEnv();
    const baseUrl = getBaseUrl(creds.environment);

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

    const res = await fetch(`${baseUrl}/payment_links`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.privateKey}`,
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
   * Obtiene detalles del payment link (para reconciliación).
   * Algunas implementaciones de Wompi incluyen la transacción asociada.
   * Si no existe el endpoint o no hay transacción, retorna null.
   */
  async obtenerPaymentLink(
    paymentLinkId: string,
    credenciales?: WompiCredenciales,
  ): Promise<{
    id: string;
    transactions?: Array<{
      id: string;
      status: string;
      amount_in_cents: number;
      reference?: string;
      payment_link_id?: string;
    }>;
  } | null> {
    const creds = credenciales ?? this.credencialesDesdeEnv();
    const baseUrl = getBaseUrl(creds.environment);

    try {
      const res = await fetch(`${baseUrl}/payment_links/${paymentLinkId}`, {
        headers: {
          Authorization: `Bearer ${creds.privateKey}`,
        },
      });

      if (!res.ok) return null;

      const json = (await res.json()) as { data?: unknown };
      const data = json.data as Record<string, unknown> | undefined;
      if (!data) return null;

      const transactions = data.transactions as
        | Array<{
            id: string;
            status: string;
            amount_in_cents: number;
            reference?: string;
            payment_link_id?: string;
          }>
        | undefined;

      return {
        id: String((data.id as string) ?? paymentLinkId),
        transactions: Array.isArray(transactions) ? transactions : undefined,
      };
    } catch {
      return null;
    }
  }

  /**
   * Consulta una transacción por ID (para rescate al retorno).
   * Si credenciales no se pasan, usa env (fallback).
   */
  async obtenerTransaccion(
    transactionId: string,
    credenciales?: WompiCredenciales,
  ): Promise<{
    id: string;
    status: string;
    amount_in_cents: number;
    currency: string;
    reference?: string;
    payment_link_id?: string;
  } | null> {
    const creds = credenciales ?? this.credencialesDesdeEnv();
    const baseUrl = getBaseUrl(creds.environment);

    try {
      const res = await fetch(`${baseUrl}/transactions/${transactionId}`, {
        headers: {
          Authorization: `Bearer ${creds.privateKey}`,
        },
      });

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
