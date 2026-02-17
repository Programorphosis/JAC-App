import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface AvisoPlataforma {
  id: string;
  titulo: string;
  contenido: string;
  fechaPublicacion: string;
  activo: boolean;
  alcance?: string;
  juntaId?: string | null;
}

/**
 * Avisos activos para usuarios de junta (dashboard).
 * Usa GET /api/avisos – solo requiere autenticación.
 */
@Injectable({ providedIn: 'root' })
export class AvisosService {
  private readonly base = `${environment.apiUrl}/avisos`;

  constructor(private readonly http: HttpClient) {}

  listarActivos(): Observable<AvisoPlataforma[]> {
    return this.http
      .get<{ data: AvisoPlataforma[] }>(this.base)
      .pipe(map((r) => r.data));
  }
}
