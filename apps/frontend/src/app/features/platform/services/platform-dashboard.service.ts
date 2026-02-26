import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface DashboardData {
  totalJuntas: number;
  juntasActivas: number;
  juntasInactivas: number;
  juntasNuevasEsteMes: number;
  /** PA5-5: Juntas con suscripción vencida. */
  juntasVencidas?: number;
  /** PA5-5: Juntas con uso ≥80% en algún límite. */
  juntasCercanasALimite?: number;
}

/**
 * Servicio de dashboard para Platform Admin.
 */
@Injectable({ providedIn: 'root' })
export class PlatformDashboardService {
  private readonly base = `${environment.apiUrl}/platform/dashboard`;

  constructor(private readonly http: HttpClient) {}

  obtener(): Observable<DashboardData> {
    return this.http
      .get<{ data: DashboardData }>(this.base)
      .pipe(map((r) => r.data));
  }
}
