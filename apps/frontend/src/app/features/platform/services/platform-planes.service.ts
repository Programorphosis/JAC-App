import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Plan {
  id: string;
  nombre: string;
  precioMensual: number;
  precioAnual: number;
  limiteUsuarios: number | null;
  limiteStorageMb: number | null;
  limiteCartasMes: number | null;
  diasPrueba: number;
  activo: boolean;
}

/**
 * Servicio de planes para Platform Admin.
 */
@Injectable({ providedIn: 'root' })
export class PlatformPlanesService {
  private readonly base = `${environment.apiUrl}/platform/planes`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<Plan[]> {
    return this.http.get<{ data: Plan[] }>(this.base).pipe(map((r) => r.data));
  }
}
