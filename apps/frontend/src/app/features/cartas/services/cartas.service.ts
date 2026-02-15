import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface EstadoGeneralResult {
  deuda_junta: number;
  requisitos: Array<{ requisitoTipoId: string; nombre: string; obligacionActiva: boolean; estado: string }>;
  pago_carta: boolean;
}

export interface CartaItem {
  id: string;
  estado: string;
  fechaSolicitud: string;
  fechaEmision: string | null;
  vigenciaHasta?: string | null;
  consecutivo: number | null;
  anio: number;
  rutaPdf?: string | null;
}

export interface CartaPendienteItem {
  id: string;
  usuarioId: string;
  usuarioNombres: string;
  usuarioApellidos: string;
  usuarioDocumento: string;
  estado: string;
  fechaSolicitud: string;
}

export interface SolicitarCartaResult {
  id: string;
  estado: string;
  fechaSolicitud: string;
}

export interface ValidarCartaResult {
  cartaId: string;
  consecutivo: number;
  anio: number;
  qrToken: string;
  rutaPdf: string;
}

@Injectable({ providedIn: 'root' })
export class CartasService {
  private readonly base = `${environment.apiUrl}/cartas`;
  private readonly usuariosBase = `${environment.apiUrl}/usuarios`;
  private readonly documentosBase = `${environment.apiUrl}/documentos`;

  constructor(private readonly http: HttpClient) {}

  getEstadoGeneral(usuarioId: string): Observable<EstadoGeneralResult> {
    return this.http
      .get<{ data: EstadoGeneralResult }>(`${this.usuariosBase}/${usuarioId}/estado-general`)
      .pipe(map((r) => r.data));
  }

  listarPorUsuario(usuarioId: string): Observable<CartaItem[]> {
    return this.http
      .get<{ data: CartaItem[] }>(this.base, { params: { usuarioId } })
      .pipe(map((r) => r.data));
  }

  listarPendientes(): Observable<CartaPendienteItem[]> {
    return this.http
      .get<{ data: CartaPendienteItem[] }>(this.base, { params: { estado: 'PENDIENTE' } })
      .pipe(map((r) => r.data));
  }

  solicitar(usuarioId: string): Observable<SolicitarCartaResult> {
    return this.http
      .post<{ data: SolicitarCartaResult }>(`${this.base}/solicitar`, { usuarioId })
      .pipe(map((r) => r.data));
  }

  validar(cartaId: string): Observable<ValidarCartaResult> {
    return this.http
      .post<{ data: ValidarCartaResult }>(`${this.base}/${cartaId}/validar`, {})
      .pipe(map((r) => r.data));
  }

  getUrlDescarga(documentoId: string): Observable<{ url: string }> {
    return this.http
      .get<{ data: { url: string } }>(`${this.documentosBase}/${documentoId}/descargar`)
      .pipe(map((r) => r.data));
  }

  getUrlDescargaCarta(cartaId: string): Observable<{ url: string }> {
    return this.http
      .get<{ data: { url: string } }>(`${this.base}/${cartaId}/descargar`)
      .pipe(map((r) => r.data));
  }
}
