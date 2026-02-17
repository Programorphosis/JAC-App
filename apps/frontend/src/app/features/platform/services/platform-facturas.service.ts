import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type EstadoFactura = 'PENDIENTE' | 'PAGADA' | 'PARCIAL' | 'VENCIDA' | 'CANCELADA';
export type TipoFactura = 'MENSUAL' | 'MANUAL' | 'AJUSTE';
export type MetodoPagoFactura = 'EFECTIVO' | 'TRANSFERENCIA' | 'ONLINE' | 'CHEQUE' | 'OTRO';

export interface FacturaItem {
  id: string;
  juntaId: string;
  monto: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: EstadoFactura;
  tipo: TipoFactura;
  referenciaExterna: string | null;
  suscripcion?: { id: string; plan: { nombre: string } } | null;
  creadoPor?: { nombres: string; apellidos: string } | null;
  pagos: Array<{ id: string; monto: number; fecha: string; metodo: string }>;
  _count: { pagos: number };
}

export interface PagoFacturaItem {
  id: string;
  facturaId: string;
  monto: number;
  fecha: string;
  metodo: MetodoPagoFactura;
  referencia: string | null;
  referenciaExterna: string | null;
  factura: {
    id: string;
    monto: number;
    fechaEmision: string;
    fechaVencimiento: string;
    estado: EstadoFactura;
    tipo: TipoFactura;
  };
}

export interface PaginatedFacturas {
  data: FacturaItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface PaginatedPagosPlataforma {
  data: PagoFacturaItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

export interface CrearFacturaDto {
  monto: number;
  fechaVencimiento: string;
  tipo?: TipoFactura;
  referenciaExterna?: string;
  metadata?: Record<string, unknown>;
}

export interface RegistrarPagoDto {
  monto: number;
  metodo: MetodoPagoFactura;
  referencia?: string;
  referenciaExterna?: string;
}

@Injectable({ providedIn: 'root' })
export class PlatformFacturasService {
  private readonly base = `${environment.apiUrl}/platform/juntas`;

  constructor(private readonly http: HttpClient) {}

  listarFacturas(
    juntaId: string,
    page = 1,
    limit = 20,
    estado?: EstadoFactura
  ): Observable<PaginatedFacturas> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (estado) params = params.set('estado', estado);
    return this.http.get<PaginatedFacturas>(`${this.base}/${juntaId}/facturas`, {
      params,
    });
  }

  crearFactura(
    juntaId: string,
    dto: CrearFacturaDto
  ): Observable<{ data: FacturaItem }> {
    return this.http.post<{ data: FacturaItem }>(
      `${this.base}/${juntaId}/facturas`,
      dto
    );
  }

  listarPagosPlataforma(
    juntaId: string,
    page = 1,
    limit = 20
  ): Observable<PaginatedPagosPlataforma> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedPagosPlataforma>(
      `${this.base}/${juntaId}/pagos-plataforma`,
      { params }
    );
  }

  registrarPago(
    juntaId: string,
    facturaId: string,
    dto: RegistrarPagoDto
  ): Observable<{ data: { pago: PagoFacturaItem; factura: FacturaItem } }> {
    return this.http.post<{ data: { pago: PagoFacturaItem; factura: FacturaItem } }>(
      `${this.base}/${juntaId}/facturas/${facturaId}/pago`,
      dto
    );
  }

  cancelarFactura(
    juntaId: string,
    facturaId: string
  ): Observable<{ data: FacturaItem }> {
    return this.http.patch<{ data: FacturaItem }>(
      `${this.base}/${juntaId}/facturas/${facturaId}/cancelar`,
      {}
    );
  }

  reactivarFactura(
    juntaId: string,
    facturaId: string
  ): Observable<{ data: FacturaItem }> {
    return this.http.patch<{ data: FacturaItem }>(
      `${this.base}/${juntaId}/facturas/${facturaId}/reactivar`,
      {}
    );
  }

  generarFacturasMensuales(): Observable<{
    data: { generadas: number; omitidas: number; errores: string[] };
  }> {
    return this.http.post<{
      data: { generadas: number; omitidas: number; errores: string[] };
    }>(`${environment.apiUrl}/platform/facturas/generar-mensuales`, {});
  }
}
