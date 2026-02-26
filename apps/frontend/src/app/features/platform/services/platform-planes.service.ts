import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface Plan {
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
  esPersonalizable?: boolean;
  diasPrueba: number;
  activo: boolean;
  /** Precios por demanda (COP por unidad adicional). Solo si esPersonalizable. */
  precioPorUsuarioAdicional?: number | null;
  precioPorMbAdicional?: number | null;
  precioPorCartaAdicional?: number | null;
}

export interface CrearPlanBody {
  nombre: string;
  descripcion?: string;
  precioMensual: number;
  precioAnual: number;
  limiteUsuarios?: number | null;
  limiteStorageMb?: number | null;
  limiteCartasMes?: number | null;
  permiteUsuariosIlimitados?: boolean;
  permiteStorageIlimitado?: boolean;
  permiteCartasIlimitadas?: boolean;
  esPersonalizable?: boolean;
  diasPrueba?: number;
  precioPorUsuarioAdicional?: number | null;
  precioPorMbAdicional?: number | null;
  precioPorCartaAdicional?: number | null;
}

export interface ActualizarPlanBody extends Partial<CrearPlanBody> {
  activo?: boolean;
}

/**
 * Servicio de planes para Platform Admin.
 */
@Injectable({ providedIn: 'root' })
export class PlatformPlanesService {
  private readonly base = `${environment.apiUrl}/platform/planes`;

  constructor(private readonly http: HttpClient) {}

  listar(incluirInactivos = false): Observable<Plan[]> {
    const url = incluirInactivos ? `${this.base}?incluirInactivos=true` : this.base;
    return this.http.get<{ data: Plan[] }>(url).pipe(map((r) => r.data));
  }

  obtener(id: string): Observable<Plan> {
    return this.http.get<{ data: Plan }>(`${this.base}/${id}`).pipe(map((r) => r.data));
  }

  crear(body: CrearPlanBody): Observable<Plan> {
    return this.http.post<{ data: Plan }>(this.base, body).pipe(map((r) => r.data));
  }

  actualizar(id: string, body: ActualizarPlanBody): Observable<Plan> {
    return this.http.patch<{ data: Plan }>(`${this.base}/${id}`, body).pipe(map((r) => r.data));
  }
}
