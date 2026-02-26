import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { PaginatedResponse } from './platform-juntas.service';

export interface AuditoriaPlataformaItem {
  id: string;
  entidad: string;
  entidadId: string;
  accion: string;
  metadata: Record<string, unknown>;
  fecha: string;
  ejecutadoPor: { id: string; nombres: string; apellidos: string } | null;
  junta: { id: string; nombre: string } | null;
}

export type TipoAuditoriaPlataforma = 'juntas' | 'accesos' | 'all';

/**
 * Servicio de auditoría de plataforma para Platform Admin.
 * Autocontenido para futura migración a microservicio.
 */
@Injectable({ providedIn: 'root' })
export class PlatformAuditoriaService {
  private readonly base = `${environment.apiUrl}/platform/auditoria`;

  constructor(private readonly http: HttpClient) {}

  listar(
    page = 1,
    limit = 50,
    tipo: TipoAuditoriaPlataforma = 'all'
  ): Observable<PaginatedResponse<AuditoriaPlataformaItem>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (tipo !== 'all') {
      params = params.set('tipo', tipo);
    }
    return this.http.get<PaginatedResponse<AuditoriaPlataformaItem>>(
      this.base,
      { params }
    );
  }
}
