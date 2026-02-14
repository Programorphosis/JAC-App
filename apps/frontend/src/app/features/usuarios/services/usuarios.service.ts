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
  activo: boolean;
  fechaCreacion: string;
  roles: string[];
}

export interface CreateUserBody {
  tipoDocumento: string;
  numeroDocumento: string;
  nombres: string;
  apellidos: string;
  telefono?: string;
  direccion?: string;
  password: string;
  roles?: string[];
}

export interface UpdateUserBody {
  nombres?: string;
  apellidos?: string;
  telefono?: string;
  direccion?: string;
  activo?: boolean;
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

  listar(page = 1, limit = 20): Observable<{ data: UsuarioListItem[]; meta: { total: number } }> {
    const params = new HttpParams().set('page', page).set('limit', limit);
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
