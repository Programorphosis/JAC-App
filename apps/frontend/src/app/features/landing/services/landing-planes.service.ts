import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map, of, catchError } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface PlanPublico {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precioMensual: number;
  precioAnual: number;
  limiteUsuarios: number | null;
  limiteStorageMb: number | null;
  limiteCartasMes: number | null;
  permiteUsuariosIlimitados?: boolean;
  permiteStorageIlimitado?: boolean;
  permiteCartasIlimitadas?: boolean;
  diasPrueba: number;
}

@Injectable({ providedIn: 'root' })
export class LandingPlanesService {
  private readonly url = `${environment.apiUrl}/public/planes`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<PlanPublico[]> {
    return this.http.get<{ data: PlanPublico[] }>(this.url).pipe(
      map((r) => r.data),
      catchError(() => of([])),
    );
  }
}
