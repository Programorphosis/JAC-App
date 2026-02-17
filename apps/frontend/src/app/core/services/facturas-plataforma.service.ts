import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoFacturaJunta =
  | 'PENDIENTE'
  | 'PAGADA'
  | 'PARCIAL'
  | 'VENCIDA'
  | 'CANCELADA';

export interface FacturaPlataformaItem {
  id: string;
  juntaId: string;
  monto: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: EstadoFacturaJunta;
  tipo: string;
  suscripcion?: { id: string; plan: { nombre: string } } | null;
  pagos: Array<{ id: string; monto: number }>;
}

export interface PaginatedFacturasPlataforma {
  data: FacturaPlataformaItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Facturas de la plataforma vistas por la junta (admin, tesorera, secretaria).
 * GET /api/facturas-plataforma – solo lectura.
 */
@Injectable({ providedIn: 'root' })
export class FacturasPlataformaService {
  private readonly base = `${environment.apiUrl}/facturas-plataforma`;

  constructor(private readonly http: HttpClient) {}

  listar(
    page = 1,
    limit = 20,
    estado?: EstadoFacturaJunta
  ): Observable<PaginatedFacturasPlataforma> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (estado) params = params.set('estado', estado);
    return this.http.get<PaginatedFacturasPlataforma>(this.base, { params });
  }

  listarPendientes(): Observable<FacturaPlataformaItem[]> {
    return this.http
      .get<{ data: FacturaPlataformaItem[] }>(`${this.base}/pendientes`)
      .pipe(map((r) => r.data));
  }

  /** Crea intención de pago online. Redirige a checkout Wompi. */
  crearIntencionPago(facturaId: string): Observable<{ checkoutUrl: string; referencia: string }> {
    return this.http.post<{ checkoutUrl: string; referencia: string }>(
      `${this.base}/intencion`,
      { facturaId },
    );
  }

  /** Verifica pago tras retorno de Wompi. */
  verificarPago(
    facturaId: string,
    transactionId: string,
  ): Observable<{ registrado: boolean; codigo: string; mensaje: string; estado?: string }> {
    return this.http.get<{
      registrado: boolean;
      codigo: string;
      mensaje: string;
      estado?: string;
    }>(`${this.base}/verificar`, {
      params: { factura_id: facturaId, transaction_id: transactionId },
    });
  }
}
