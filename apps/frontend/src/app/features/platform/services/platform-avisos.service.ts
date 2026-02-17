import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export type AlcanceAviso = 'PLATAFORMA' | 'TODAS_JUNTAS' | 'JUNTA_ESPECIFICA';

export interface AvisoPlataforma {
  id: string;
  titulo: string;
  contenido: string;
  fechaPublicacion: string;
  activo: boolean;
  alcance: AlcanceAviso;
  juntaId: string | null;
  junta?: { id: string; nombre: string } | null;
}

/**
 * PA-9: Avisos de plataforma – CRUD para administradores.
 */
@Injectable({ providedIn: 'root' })
export class PlatformAvisosService {
  private readonly base = `${environment.apiUrl}/platform/avisos`;

  constructor(private readonly http: HttpClient) {}

  listar(activo?: boolean): Observable<AvisoPlataforma[]> {
    let params = new HttpParams();
    if (activo !== undefined) {
      params = params.set('activo', activo.toString());
    }
    return this.http
      .get<{ data: AvisoPlataforma[] }>(this.base, { params })
      .pipe(map((r) => r.data));
  }

  crear(dto: {
    titulo: string;
    contenido: string;
    alcance?: AlcanceAviso;
    juntaId?: string;
  }): Observable<AvisoPlataforma> {
    return this.http
      .post<{ data: AvisoPlataforma }>(this.base, dto)
      .pipe(map((r) => r.data));
  }

  actualizar(
    id: string,
    dto: {
      titulo?: string;
      contenido?: string;
      activo?: boolean;
      alcance?: AlcanceAviso;
      juntaId?: string | null;
    }
  ): Observable<AvisoPlataforma> {
    return this.http
      .patch<{ data: AvisoPlataforma }>(`${this.base}/${id}`, dto)
      .pipe(map((r) => r.data));
  }

  eliminar(id: string): Observable<void> {
    return this.http
      .delete<{ data: { id: string } }>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }
}
