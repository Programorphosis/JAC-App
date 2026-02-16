import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface RegistrarPagoEfectivoBody {
  usuarioId: string;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA';
  referenciaExterna?: string;
}

export interface RegistrarPagoCartaBody {
  usuarioId: string;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA';
  referenciaExterna?: string;
}

export interface IntencionPagoResult {
  checkoutUrl: string;
  referencia: string;
  monto: number;
  montoCents: number;
}

export interface VerificarPagoResult {
  registrado: boolean;
  pagoId?: string;
  monto?: number;
  consecutivo?: number;
  status?: string;
}

export interface PagoListItem {
  id: string;
  tipo: string;
  metodo: string;
  monto: number;
  consecutivo: number;
  referenciaExterna: string | null;
  fechaPago: string;
  vigencia: boolean | null;
  usuarioId: string;
  usuarioNombre: string | null;
  registradoPorNombre: string | null;
}

export interface PagosListResponse {
  data: PagoListItem[];
  meta: { total: number; page: number; limit: number };
}

export interface EstadisticasPagos {
  total: number;
  porMetodo: {
    efectivo: number;
    transferencia: number;
    online: number;
    onlineTesorera: number;
    onlineUsuarios: number;
  };
  porTipo: {
    carta: number;
    tarifa: number;
  };
  porMes: Array<{ mes: number; anio: number; total: number }>;
  porAnio: Array<{ anio: number; total: number }>;
}

@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly base = `${environment.apiUrl}/pagos`;

  constructor(private readonly http: HttpClient) {}

  registrarEfectivo(body: RegistrarPagoEfectivoBody): Observable<{ pagoId: string; monto: number; consecutivo: number }> {
    return this.http
      .post<{ data: { pagoId: string; monto: number; consecutivo: number } }>(this.base, body)
      .pipe(map((r) => r.data));
  }

  registrarCarta(body: RegistrarPagoCartaBody): Observable<{ pagoId: string; monto: number; consecutivo: number }> {
    return this.http
      .post<{ data: { pagoId: string; monto: number; consecutivo: number } }>(`${this.base}/carta`, body)
      .pipe(map((r) => r.data));
  }

  crearIntencionOnline(usuarioId: string): Observable<IntencionPagoResult> {
    return this.http
      .post<{ data: IntencionPagoResult }>(`${this.base}/online/intencion`, { usuarioId })
      .pipe(map((r) => r.data));
  }

  crearIntencionCartaOnline(usuarioId: string): Observable<IntencionPagoResult> {
    return this.http
      .post<{ data: IntencionPagoResult }>(`${this.base}/carta/online/intencion`, { usuarioId })
      .pipe(map((r) => r.data));
  }

  verificarPagoOnline(transactionId: string): Observable<VerificarPagoResult> {
    return this.http
      .get<{ data: VerificarPagoResult }>(`${this.base}/online/verificar`, {
        params: { transaction_id: transactionId },
      })
      .pipe(map((r) => r.data));
  }

  listar(params?: {
    page?: number;
    limit?: number;
    usuarioId?: string;
    tipo?: 'JUNTA' | 'CARTA';
    fechaDesde?: string;
    fechaHasta?: string;
    search?: string;
    sortBy?: 'fechaPago' | 'monto' | 'tipo' | 'metodo' | 'consecutivo';
    sortOrder?: 'asc' | 'desc';
  }): Observable<PagosListResponse> {
    let httpParams: Record<string, string> = {};
    if (params) {
      if (params.page != null) httpParams['page'] = String(params.page);
      if (params.limit != null) httpParams['limit'] = String(params.limit);
      if (params.usuarioId) httpParams['usuarioId'] = params.usuarioId;
      if (params.tipo) httpParams['tipo'] = params.tipo;
      if (params.fechaDesde) httpParams['fechaDesde'] = params.fechaDesde;
      if (params.fechaHasta) httpParams['fechaHasta'] = params.fechaHasta;
      if (params.search && params.search.trim().length >= 2) httpParams['search'] = params.search.trim();
      if (params.sortBy) httpParams['sortBy'] = params.sortBy;
      if (params.sortOrder) httpParams['sortOrder'] = params.sortOrder;
    }
    return this.http.get<PagosListResponse>(this.base, { params: httpParams });
  }

  getEstadisticas(anio?: number): Observable<EstadisticasPagos> {
    if (anio != null) {
      return this.http.get<EstadisticasPagos>(`${this.base}/estadisticas`, {
        params: { anio: String(anio) },
      });
    }
    return this.http.get<EstadisticasPagos>(`${this.base}/estadisticas`);
  }
}
