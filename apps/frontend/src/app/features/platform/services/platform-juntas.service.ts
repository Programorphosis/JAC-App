import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface JuntaListItem {
  id: string;
  nombre: string;
  nit: string | null;
  montoCarta: number | null;
  fechaCreacion: string;
  activo: boolean;
  fechaBaja: string | null;
  telefono?: string | null;
  email?: string | null;
  direccion?: string | null;
  ciudad?: string | null;
  departamento?: string | null;
  personeriaJuridica?: string | null;
  membreteUrl?: string | null;
  enMantenimiento?: boolean;
  _count: { usuarios: number; pagos: number };
}

export interface JuntaAdminInfo {
  id: string;
  nombres: string;
  apellidos: string;
  numeroDocumento: string;
  activo: boolean;
}

export interface JuntaSuscripcionInfo {
  id: string;
  estado: string;
  fechaInicio: string;
  fechaVencimiento: string;
  periodo?: 'mensual' | 'anual';
  planIdPendiente?: string | null;
  esPlanPersonalizado?: boolean;
  overrideLimiteUsuarios?: number | null;
  overrideLimiteStorageMb?: number | null;
  overrideLimiteCartasMes?: number | null;
  motivoPersonalizacion?: string | null;
  plan: {
    id: string;
    nombre: string;
    precioMensual: number;
    precioAnual: number;
    limiteUsuarios: number | null;
    limiteStorageMb: number | null;
    limiteCartasMes: number | null;
    esPersonalizable?: boolean;
    permiteUsuariosIlimitados?: boolean;
    permiteStorageIlimitado?: boolean;
    permiteCartasIlimitadas?: boolean;
  };
}

export interface JuntaDetalle extends JuntaListItem {
  _count: { usuarios: number; pagos: number; cartas: number };
  admin: JuntaAdminInfo | null;
  suscripcion: JuntaSuscripcionInfo | null;
  wompiConfigurado?: boolean;
}

export interface JuntaUsuarioItem {
  id: string;
  nombres: string;
  apellidos: string;
  numeroDocumento: string;
  activo: boolean;
  esAdmin: boolean;
}

export interface CreateJuntaAdminUser {
  nombres: string;
  apellidos: string;
  tipoDocumento: string;
  numeroDocumento: string;
  telefono?: string;
  direccion?: string;
}

export interface CreateJuntaBody {
  nombre: string;
  email: string;
  telefono: string;
  nit?: string;
  montoCarta?: number;
  adminUser: CreateJuntaAdminUser;
  planId?: string;
  diasPrueba?: number;
  aceptoTerminos: boolean;
}

export interface CreateJuntaResult {
  junta: { id: string; nombre: string; nit: string | null; montoCarta: number | null };
  adminUsuario: { id: string; nombres: string; apellidos: string; numeroDocumento: string };
  passwordTemporal: string;
}

export interface PaginatedResponse<T> {
  data: T[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Servicio de gestión de juntas para Platform Admin.
 * Autocontenido para futura migración a microservicio.
 */
@Injectable({ providedIn: 'root' })
export class PlatformJuntasService {
  private readonly base = `${environment.apiUrl}/platform/juntas`;

  constructor(private readonly http: HttpClient) {}

  listar(
    page = 1,
    limit = 20,
    activo?: boolean
  ): Observable<PaginatedResponse<JuntaListItem>> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (activo !== undefined) {
      params = params.set('activo', activo.toString());
    }
    return this.http.get<PaginatedResponse<JuntaListItem>>(this.base, {
      params,
    });
  }

  obtener(id: string): Observable<JuntaDetalle> {
    return this.http
      .get<{ data: JuntaDetalle }>(`${this.base}/${id}`)
      .pipe(map((r) => r.data));
  }

  crear(body: CreateJuntaBody): Observable<CreateJuntaResult> {
    return this.http
      .post<{ data: CreateJuntaResult }>(this.base, body)
      .pipe(map((r) => r.data));
  }

  actualizar(
    id: string,
    body: {
      nombre?: string;
      nit?: string;
      montoCarta?: number;
      activo?: boolean;
      telefono?: string | null;
      email?: string | null;
      direccion?: string | null;
      ciudad?: string | null;
      departamento?: string | null;
      personeriaJuridica?: string | null;
      membreteUrl?: string | null;
      enMantenimiento?: boolean;
    }
  ): Observable<JuntaDetalle> {
    return this.http
      .patch<{ data: JuntaDetalle }>(`${this.base}/${id}`, body)
      .pipe(map((r) => r.data));
  }

  actualizarWompi(
    juntaId: string,
    body: {
      wompiPrivateKey?: string | null;
      wompiPublicKey?: string | null;
      wompiIntegritySecret?: string | null;
      wompiEventsSecret?: string | null;
      wompiEnvironment?: string | null;
    }
  ): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/${juntaId}/wompi`, body);
  }

  darBaja(id: string): Observable<JuntaDetalle> {
    return this.http
      .delete<{ data: JuntaDetalle }>(`${this.base}/${id}`)
      .pipe(map((r) => r.data));
  }

  listarUsuarios(juntaId: string): Observable<JuntaUsuarioItem[]> {
    return this.http
      .get<{ data: JuntaUsuarioItem[] }>(`${this.base}/${juntaId}/usuarios`)
      .pipe(map((r) => r.data));
  }

  resetPasswordAdmin(juntaId: string): Observable<{ adminUsuario: JuntaAdminInfo; passwordTemporal: string }> {
    return this.http
      .post<{ data: { adminUsuario: JuntaAdminInfo; passwordTemporal: string } }>(
        `${this.base}/${juntaId}/admin/reset-password`,
        {}
      )
      .pipe(map((r) => r.data));
  }

  cambiarAdmin(juntaId: string, nuevoAdminUsuarioId: string): Observable<{ adminUsuario: JuntaAdminInfo }> {
    return this.http
      .patch<{ data: { adminUsuario: JuntaAdminInfo } }>(`${this.base}/${juntaId}/admin`, {
        nuevoAdminUsuarioId,
      })
      .pipe(map((r) => r.data));
  }

  reenviarCredencialesAdmin(
    juntaId: string
  ): Observable<{ adminUsuario: JuntaAdminInfo; passwordTemporal: string }> {
    return this.http
      .post<{ data: { adminUsuario: JuntaAdminInfo; passwordTemporal: string } }>(
        `${this.base}/${juntaId}/admin/reenviar-credenciales`,
        {}
      )
      .pipe(map((r) => r.data));
  }

  bloquearAdmin(juntaId: string): Observable<{ adminUsuario: JuntaAdminInfo }> {
    return this.http
      .patch<{ data: { adminUsuario: JuntaAdminInfo } }>(`${this.base}/${juntaId}/admin/bloquear`, {})
      .pipe(map((r) => r.data));
  }

  resumen(juntaId: string): Observable<JuntaResumen> {
    return this.http
      .get<{ data: JuntaResumen }>(`${this.base}/${juntaId}/resumen`)
      .pipe(map((r) => r.data));
  }

  uso(juntaId: string): Observable<JuntaUso> {
    return this.http
      .get<{ data: JuntaUso }>(`${this.base}/${juntaId}/uso`)
      .pipe(map((r) => r.data));
  }

  obtenerSuscripcion(juntaId: string): Observable<SuscripcionDetalle | null> {
    return this.http
      .get<{ data: SuscripcionDetalle | null }>(`${this.base}/${juntaId}/suscripcion`)
      .pipe(map((r) => r.data));
  }

  crearSuscripcion(
    juntaId: string,
    planId: string,
    diasPrueba?: number,
    periodo?: 'mensual' | 'anual',
  ): Observable<SuscripcionDetalle> {
    return this.http
      .post<{ data: SuscripcionDetalle }>(`${this.base}/${juntaId}/suscripcion`, {
        planId,
        diasPrueba,
        periodo,
      })
      .pipe(map((r) => r.data));
  }

  alertas(juntaId: string): Observable<AlertaLimite[]> {
    return this.http
      .get<{ data: AlertaLimite[] }>(`${this.base}/${juntaId}/alertas`)
      .pipe(map((r) => r.data));
  }

  listarNotas(juntaId: string, page = 1, limit = 50): Observable<PaginatedNotas> {
    const params = new HttpParams().set('page', page).set('limit', limit);
    return this.http.get<PaginatedNotas>(`${this.base}/${juntaId}/notas`, {
      params,
    });
  }

  crearNota(juntaId: string, contenido: string): Observable<{ data: NotaJuntaItem }> {
    return this.http.post<{ data: NotaJuntaItem }>(
      `${this.base}/${juntaId}/notas`,
      { contenido }
    );
  }

  exportarJson(juntaId: string): Observable<unknown> {
    return this.http.get(`${this.base}/${juntaId}/exportar`, {
      params: new HttpParams().set('format', 'json'),
    });
  }

  exportarCsv(juntaId: string): Observable<Blob> {
    return this.http.get(`${this.base}/${juntaId}/exportar`, {
      params: new HttpParams().set('format', 'csv'),
      responseType: 'blob',
    });
  }

  actualizarSuscripcion(
    juntaId: string,
    body: {
      planId?: string;
      periodo?: 'mensual' | 'anual';
      fechaVencimiento?: string;
      estado?: string;
      overrideLimiteUsuarios?: number | null;
      overrideLimiteStorageMb?: number | null;
      overrideLimiteCartasMes?: number | null;
      motivoPersonalizacion?: string | null;
      /** Solo platform admin. Omite validación día de corte para downgrade. */
      forzarDowngrade?: boolean;
    }
  ): Observable<SuscripcionDetalle> {
    return this.http
      .patch<{ data: SuscripcionDetalle }>(`${this.base}/${juntaId}/suscripcion`, body)
      .pipe(map((r) => r.data));
  }

  crearIntencionUpgrade(
    juntaId: string,
    params: {
      suscripcionId: string;
      planId: string;
      periodo?: 'mensual' | 'anual';
    }
  ): Observable<{ checkoutUrl: string; referencia: string; facturaId: string }> {
    return this.http.post<{ checkoutUrl: string; referencia: string; facturaId: string }>(
      `${this.base}/${juntaId}/intencion-upgrade`,
      params,
    );
  }

  crearIntencionOverrides(
    juntaId: string,
    params: {
      suscripcionId: string;
      overrideLimiteUsuarios?: number | null;
      overrideLimiteStorageMb?: number | null;
      overrideLimiteCartasMes?: number | null;
      motivoPersonalizacion?: string | null;
    }
  ): Observable<{ checkoutUrl: string; referencia: string; facturaId: string }> {
    return this.http.post<{ checkoutUrl: string; referencia: string; facturaId: string }>(
      `${this.base}/${juntaId}/intencion-overrides`,
      params,
    );
  }
}

export interface SuscripcionDetalle {
  id: string;
  estado: string;
  fechaInicio: string;
  fechaVencimiento: string;
  plan: {
    id: string;
    nombre: string;
    precioMensual: number;
    precioAnual: number;
    limiteUsuarios: number | null;
    limiteStorageMb: number | null;
    limiteCartasMes: number | null;
  };
}

export interface JuntaResumen {
  totalUsuarios: number;
  totalPagos: number;
  totalCartas: number;
  pagosRecientes: Array<{
    id: string;
    monto: number;
    tipo: string;
    fechaPago: string;
    usuario: { nombres: string; apellidos: string };
  }>;
  cartasRecientes: Array<{
    id: string;
    consecutivo: number | null;
    anio: number;
    fechaEmision: string | null;
    usuario: { nombres: string; apellidos: string };
  }>;
}

/** Límites efectivos (override ?? plan). null = ilimitado. */
export interface LimitesEfectivos {
  limiteUsuarios: number | null;
  limiteStorageMb: number | null;
  limiteCartasMes: number | null;
}

export interface JuntaUso {
  storageMb?: number; // PA5-1: storage real en MB (para barra vs limiteStorageMb)
  usuariosActivos: number;
  pagosEsteMes: number;
  cartasEsteMes: number;
  documentosCount: number;
  mes: string;
  /** PA5-5: límites efectivos (null = sin suscripción, valor null = ilimitado). */
  limitesEfectivos?: LimitesEfectivos | null;
}

export type NivelAlerta = 'OK' | 'ADVERTENCIA' | 'CRITICO' | 'BLOQUEO';

export interface AlertaLimite {
  tipo: 'usuarios' | 'storage' | 'cartas';
  mensaje: string;
  actual: number;
  limite: number;
  porcentaje: number;
  nivel?: NivelAlerta;
}

export interface NotaJuntaItem {
  id: string;
  juntaId: string;
  contenido: string;
  fechaCreacion: string;
  creadoPor: { id: string; nombres: string; apellidos: string };
}

export interface PaginatedNotas {
  data: NotaJuntaItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}
