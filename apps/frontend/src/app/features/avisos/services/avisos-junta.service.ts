import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface AvisoJunta {
  id: string;
  titulo: string;
  contenido: string;
  fechaPublicacion: string;
  activo?: boolean;
  creadoPor?: { nombres: string; apellidos: string };
}

/**
 * Avisos de junta – comunicados admin/secretaria → afiliados.
 * Independiente de AvisosService (platform). Rutas: /api/avisos-junta
 */
@Injectable({ providedIn: 'root' })
export class AvisosJuntaService {
  private readonly base = `${environment.apiUrl}/avisos-junta`;

  constructor(private readonly http: HttpClient) {}

  listarActivos(): Observable<AvisoJunta[]> {
    return this.http
      .get<{ data: AvisoJunta[] }>(this.base)
      .pipe(map((r) => r.data));
  }

  listarTodos(activo?: boolean): Observable<AvisoJunta[]> {
    let params = new HttpParams();
    if (activo !== undefined) {
      params = params.set('activo', activo.toString());
    }
    return this.http
      .get<{ data: AvisoJunta[] }>(`${this.base}/gestion`, { params })
      .pipe(map((r) => r.data));
  }

  crear(dto: { titulo: string; contenido: string }): Observable<AvisoJunta> {
    return this.http
      .post<{ data: AvisoJunta }>(this.base, dto)
      .pipe(map((r) => r.data));
  }

  actualizar(
    id: string,
    dto: { titulo?: string; contenido?: string; activo?: boolean }
  ): Observable<AvisoJunta> {
    return this.http
      .patch<{ data: AvisoJunta }>(`${this.base}/${id}`, dto)
      .pipe(map((r) => r.data));
  }

  eliminar(id: string): Observable<void> {
    return this.http
      .delete<{ data: { id: string } }>(`${this.base}/${id}`)
      .pipe(map(() => undefined));
  }
}
