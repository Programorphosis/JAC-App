import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface RequisitoTipoItem {
  id: string;
  nombre: string;
  tieneCorteAutomatico: boolean;
  activo: boolean;
  modificadorId: string | null;
  modificador?: { id: string; nombres: string; apellidos: string };
}

export interface CreateRequisitoTipoBody {
  nombre: string;
  modificadorId?: string;
  tieneCorteAutomatico?: boolean;
}

export interface UpdateRequisitoTipoBody {
  nombre?: string;
  modificadorId?: string | null;
  tieneCorteAutomatico?: boolean;
  activo?: boolean;
}

export interface EstadoGeneralResult {
  deuda_junta: number;
  requisitos: Array<{
    requisitoTipoId: string;
    nombre: string;
    obligacionActiva: boolean;
    estado: string;
  }>;
  pago_carta: boolean;
}

@Injectable({ providedIn: 'root' })
export class RequisitosService {
  private readonly base = `${environment.apiUrl}/requisitos`;
  private readonly usuariosBase = `${environment.apiUrl}/usuarios`;

  constructor(private readonly http: HttpClient) {}

  listar(): Observable<RequisitoTipoItem[]> {
    return this.http
      .get<{ data: RequisitoTipoItem[] }>(this.base)
      .pipe(map((r) => r.data));
  }

  crear(body: CreateRequisitoTipoBody): Observable<RequisitoTipoItem> {
    return this.http
      .post<RequisitoTipoItem>(this.base, body)
      .pipe(map((r: unknown) => r as RequisitoTipoItem));
  }

  actualizar(id: string, body: UpdateRequisitoTipoBody): Observable<RequisitoTipoItem> {
    return this.http.patch<RequisitoTipoItem>(`${this.base}/${id}`, body);
  }

  getEstadoGeneral(usuarioId: string): Observable<EstadoGeneralResult> {
    return this.http
      .get<{ data: EstadoGeneralResult }>(`${this.usuariosBase}/${usuarioId}/estado-general`)
      .pipe(map((r) => r.data));
  }

  actualizarEstado(
    usuarioId: string,
    requisitoTipoId: string,
    estado: 'AL_DIA' | 'MORA'
  ): Observable<{ ok: boolean }> {
    return this.http
      .post<{ data: { ok: boolean } }>(
        `${this.usuariosBase}/${usuarioId}/requisitos/${requisitoTipoId}/estado`,
        { estado }
      )
      .pipe(map((r) => r.data));
  }

  actualizarObligacion(
    usuarioId: string,
    requisitoTipoId: string,
    obligacionActiva: boolean
  ): Observable<{ ok: boolean }> {
    return this.http
      .patch<{ data: { ok: boolean } }>(
        `${this.usuariosBase}/${usuarioId}/requisitos/${requisitoTipoId}/obligacion`,
        { obligacionActiva }
      )
      .pipe(map((r) => r.data));
  }
}
