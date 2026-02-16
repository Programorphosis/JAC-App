import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AuditoriaItem {
  id: string;
  entidad: string;
  entidadId: string;
  accion: string;
  metadata: Record<string, unknown>;
  fecha: string;
  ejecutadoPor: { id: string; nombres: string; apellidos: string };
}

export interface AuditoriasResponse {
  data: AuditoriaItem[];
  meta: { total: number; timestamp: string };
}

@Injectable({ providedIn: 'root' })
export class AuditoriasService {
  private readonly base = `${environment.apiUrl}/auditorias`;

  constructor(private readonly http: HttpClient) {}

  listar(opts?: {
    page?: number;
    limit?: number;
    offset?: number;
    entidad?: string;
    search?: string;
    sortBy?: 'fecha' | 'accion' | 'entidad';
    sortOrder?: 'asc' | 'desc';
  }): Observable<AuditoriasResponse> {
    const params: Record<string, string> = {};
    const limit = opts?.limit ?? 20;
    const offset = opts?.offset ?? (opts?.page != null ? (opts.page - 1) * limit : 0);
    params['limit'] = String(limit);
    params['offset'] = String(offset);
    if (opts?.entidad) params['entidad'] = opts.entidad;
    if (opts?.search && opts.search.trim().length >= 2) params['search'] = opts.search.trim();
    if (opts?.sortBy) params['sortBy'] = opts.sortBy;
    if (opts?.sortOrder) params['sortOrder'] = opts.sortOrder;
    const qs = new URLSearchParams(params).toString();
    return this.http.get<AuditoriasResponse>(`${this.base}?${qs}`);
  }
}
