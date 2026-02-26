import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface UsuarioListItem {
  id: string;
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  telefono: string | null;
  direccion: string | null;
  lugarExpedicion?: string | null;
  activo: boolean;
  fechaCreacion: string;
  fechaAfiliacion?: string | null;
  folio?: number | null;
  numeral?: number | null;
  roles: string[];
}

export interface CreateUserBody {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  direccion?: string;
  lugarExpedicion?: string;
  password: string;
  roles?: string[];
  /** Estado laboral inicial. Por defecto NO_TRABAJANDO. */
  estadoLaboralInicial?: 'TRABAJANDO' | 'NO_TRABAJANDO';
  /** Fecha de afiliación (libro físico). Para cartas. */
  fechaAfiliacion?: string;
  /** Folio del libro de afiliados. Para cartas. */
  folio?: number;
  /** Numeral consecutivo del libro. Para cartas. */
  numeral?: number;
}

export interface UpdateUserBody {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  direccion?: string;
  lugarExpedicion?: string | null;
  activo?: boolean;
  roles?: string[];
  /** Fecha de afiliación (libro físico). Para cartas. */
  fechaAfiliacion?: string | null;
  /** Folio del libro de afiliados. Para cartas. */
  folio?: number | null;
  /** Numeral consecutivo del libro. Para cartas. */
  numeral?: number | null;
}

export interface DeudaResult {
  total: number;
  detalle?: Array<{ year: number; month: number; estadoLaboral: string; tarifaAplicada: number }>;
}

export interface HistorialLaboralItem {
  id: string;
  estado: string;
  fechaInicio: string;
  fechaFin: string | null;
  fechaCreacion?: string;
  creadoPor?: { nombres: string; apellidos: string };
}

export interface CreateHistorialBody {
  estado: 'TRABAJANDO' | 'NO_TRABAJANDO';
  fechaInicio: string;
  fechaFin?: string;
}

export interface TarifaItem {
  id: string;
  estadoLaboral: string;
  valorMensual: number;
  fechaVigencia: string;
}

export interface CreateTarifaBody {
  estadoLaboral: 'TRABAJANDO' | 'NO_TRABAJANDO';
  valorMensual: number;
  fechaVigencia: string;
}

@Injectable({ providedIn: 'root' })
export class UsuariosService {
  private readonly base = `${environment.apiUrl}/usuarios`;
  private readonly deudaBase = `${environment.apiUrl}/usuarios`;
  private readonly tarifasBase = `${environment.apiUrl}/tarifas`;

  constructor(private readonly http: HttpClient) {}

  listar(
    page = 1,
    limit = 20,
    opts?: {
      search?: string;
      activo?: boolean;
      rol?: string;
      sortBy?: 'apellidos' | 'nombres' | 'numeroDocumento' | 'fechaCreacion';
      sortOrder?: 'asc' | 'desc';
    }
  ): Observable<{ data: UsuarioListItem[]; meta: { total: number } }> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (opts?.search && opts.search.trim().length >= 2) {
      params = params.set('search', opts.search.trim());
    }
    if (opts?.activo === true) params = params.set('activo', 'true');
    if (opts?.activo === false) params = params.set('activo', 'false');
    if (opts?.rol?.trim()) params = params.set('rol', opts.rol.trim());
    if (opts?.sortBy) params = params.set('sortBy', opts.sortBy);
    if (opts?.sortOrder) params = params.set('sortOrder', opts.sortOrder);
    return this.http.get<{ data: UsuarioListItem[]; meta: { total: number; page: number; limit: number } }>(
      this.base,
      { params }
    );
  }

  obtener(id: string): Observable<UsuarioListItem> {
    return this.http.get<UsuarioListItem>(`${this.base}/${id}`);
  }

  crear(body: CreateUserBody): Observable<UsuarioListItem> {
    return this.http.post<UsuarioListItem>(this.base, body);
  }

  actualizar(id: string, body: UpdateUserBody): Observable<UsuarioListItem> {
    return this.http.patch<UsuarioListItem>(`${this.base}/${id}`, body);
  }

  getDeuda(usuarioId: string, detalle = false): Observable<DeudaResult> {
    const params = detalle ? new HttpParams().set('detalle', 'true') : undefined;
    return this.http
      .get<{ data: DeudaResult }>(`${this.deudaBase}/${usuarioId}/deuda`, { params })
      .pipe(map((r) => r.data));
  }

  getHistorial(usuarioId: string): Observable<{ data: HistorialLaboralItem[] }> {
    return this.http.get<{ data: HistorialLaboralItem[] }>(
      `${this.deudaBase}/${usuarioId}/historial-laboral`
    );
  }

  crearHistorial(usuarioId: string, body: CreateHistorialBody): Observable<HistorialLaboralItem> {
    return this.http.post<HistorialLaboralItem>(
      `${this.deudaBase}/${usuarioId}/historial-laboral`,
      body
    );
  }

  getTarifas(estadoLaboral?: string): Observable<{ data: TarifaItem[] }> {
    const params = estadoLaboral ? new HttpParams().set('estadoLaboral', estadoLaboral) : undefined;
    return this.http.get<{ data: TarifaItem[] }>(this.tarifasBase, { params });
  }

  crearTarifa(body: CreateTarifaBody): Observable<TarifaItem> {
    return this.http.post<TarifaItem>(this.tarifasBase, body);
  }
}
