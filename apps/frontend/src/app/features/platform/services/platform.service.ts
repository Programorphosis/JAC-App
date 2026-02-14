import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface JuntaListItem {
  id: string;
  nombre: string;
  nit: string | null;
  montoCarta: number | null;
  fechaCreacion: string;
  _count: { usuarios: number; pagos: number };
}

export interface JuntaDetalle extends JuntaListItem {
  _count: { usuarios: number; pagos: number; cartas: number };
}

export interface CreateJuntaAdminUser {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono?: string;
  direccion?: string;
}

export interface CreateJuntaBody {
  nombre: string;
  nit?: string;
  montoCarta?: number;
  adminUser: CreateJuntaAdminUser;
}

export interface CreateJuntaResult {
  junta: { id: string; nombre: string; nit: string | null; montoCarta: number | null };
  adminUsuario: { id: string; nombres: string; apellidos: string; numeroDocumento: string };
  passwordTemporal: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

@Injectable({ providedIn: 'root' })
export class PlatformService {
  private readonly base = `${environment.apiUrl}/platform/juntas`;

  constructor(private readonly http: HttpClient) {}

  listar(page = 1, limit = 20): Observable<PaginatedResponse<JuntaListItem>> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedResponse<JuntaListItem>>(this.base, { params });
  }

  obtener(id: string): Observable<JuntaDetalle> {
    return this.http
      .get<{ data: JuntaDetalle }>(`${this.base}/${id}`)
      .pipe(map((r) => r.data));
  }

  crear(body: CreateJuntaBody): Observable<CreateJuntaResult> {
    return this.http
      .post<{ data: CreateJuntaResult }>(this.base, body)
      .pipe(map((r) => r.data));
  }

  actualizar(
    id: string,
    body: { nombre?: string; nit?: string; montoCarta?: number }
  ): Observable<JuntaDetalle> {
    return this.http
      .patch<{ data: JuntaDetalle }>(`${this.base}/${id}`, body)
      .pipe(map((r) => r.data));
  }
}
