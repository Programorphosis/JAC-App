import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MiJuntaPlan {
  id: string;
  nombre: string;
  descripcion?: string | null;
  precioMensual: number;
  precioAnual: number;
  limiteUsuarios: number | null;
  limiteStorageMb: number | null;
  limiteCartasMes: number | null;
  esPersonalizable?: boolean;
  permiteUsuariosIlimitados?: boolean;
  permiteStorageIlimitado?: boolean;
  permiteCartasIlimitadas?: boolean;
  diasPrueba: number;
  precioPorUsuarioAdicional?: number | null;
  precioPorMbAdicional?: number | null;
  precioPorCartaAdicional?: number | null;
}

export interface MiJuntaSuscripcion {
  id: string;
  estado: string;
  fechaInicio: string;
  fechaVencimiento: string;
  periodo?: 'mensual' | 'anual' | null;
  planIdPendiente?: string | null;
  overrideLimiteUsuarios?: number | null;
  overrideLimiteStorageMb?: number | null;
  overrideLimiteCartasMes?: number | null;
  esPlanPersonalizado?: boolean;
  motivoPersonalizacion?: string | null;
  /** true si el ADMIN solicitó no renovar al final del período actual */
  cancelacionSolicitada?: boolean;
  fechaCancelacionSolicitada?: string | null;
  plan: {
    id: string;
    nombre: string;
    descripcion?: string | null;
    precioMensual: number;
    precioAnual: number;
    limiteUsuarios: number | null;
    limiteStorageMb: number | null;
    limiteCartasMes: number | null;
    esPersonalizable?: boolean;
    permiteUsuariosIlimitados?: boolean;
    permiteStorageIlimitado?: boolean;
    permiteCartasIlimitadas?: boolean;
    precioPorUsuarioAdicional?: number | null;
    precioPorMbAdicional?: number | null;
    precioPorCartaAdicional?: number | null;
  };
}

export interface MiJuntaConsumo {
  uso: {
    usuarios: number;
    storageMb: number;
    cartasEsteMes: number;
  };
  limites: {
    limiteUsuarios: number | null;
    limiteStorageMb: number | null;
    limiteCartasMes: number | null;
  } | null;
  alertas: Array<{
    tipo: 'usuarios' | 'storage' | 'cartas';
    mensaje: string;
    actual: number;
    limite: number;
    porcentaje: number;
    nivel: 'OK' | 'ADVERTENCIA' | 'CRITICO' | 'BLOQUEO';
  }>;
  mesActual: string;
}

export interface MiJuntaResponse {
  id: string;
  nombre: string;
  nit: string | null;
  montoCarta: number | null;
  vigenciaCartaMeses: number | null;
  fechaCreacion: string;
  activo: boolean;
  fechaBaja: string | null;
  telefono: string | null;
  email: string | null;
  direccion: string | null;
  ciudad: string | null;
  departamento: string | null;
  enMantenimiento: boolean;
  wompiConfigurado: boolean;
  /** URL para configurar en Wompi → URL de eventos. Solo si API_PUBLIC_URL está definida. */
  webhookUrl: string | null;
  _count: { usuarios: number; pagos: number; cartas: number };
  suscripcion: MiJuntaSuscripcion | null;
  /** Si la junta tiene al menos una tarifa configurada. Para mostrar banner de configuración. */
  tieneTarifas: boolean;
  /** Si la junta tiene escudo municipal configurado (subido a S3). Requerido para expedir cartas. */
  escudoConfigurado: boolean;
}

export interface ActualizarWompiBody {
  wompiPrivateKey?: string | null;
  wompiPublicKey?: string | null;
  wompiIntegritySecret?: string | null;
  wompiEventsSecret?: string | null;
  wompiEnvironment?: string | null;
}

@Injectable({ providedIn: 'root' })
export class MiJuntaService {
  private readonly base = `${environment.apiUrl}/mi-junta`;

  constructor(private readonly http: HttpClient) {}

  obtener(): Observable<MiJuntaResponse> {
    return this.http.get<MiJuntaResponse>(this.base);
  }

  consumo(): Observable<MiJuntaConsumo> {
    return this.http
      .get<{ data: MiJuntaConsumo }>(`${this.base}/consumo`)
      .pipe(map((r) => r.data));
  }

  cancelarSuscripcion(motivo?: string): Observable<{ ok: boolean; mensaje: string }> {
    return this.http.delete<{ ok: boolean; mensaje: string }>(`${this.base}/suscripcion`, {
      body: { motivo },
    });
  }

  actualizarDatos(body: {
    telefono?: string | null;
    email?: string | null;
    direccion?: string | null;
    ciudad?: string | null;
    departamento?: string | null;
  }): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/datos`, body);
  }

  actualizarWompi(body: ActualizarWompiBody): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/wompi`, body);
  }

  subirEscudo(file: File): Observable<{ ok: boolean }> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<{ ok: boolean }>(`${this.base}/escudo`, formData);
  }

  listarPlanes(): Observable<MiJuntaPlan[]> {
    return this.http
      .get<{ data: MiJuntaPlan[] }>(`${this.base}/planes`)
      .pipe(map((r) => r.data));
  }

  crearSuscripcion(
    planId: string,
    diasPrueba?: number,
    periodo?: 'mensual' | 'anual',
  ): Observable<{ data: MiJuntaSuscripcion }> {
    return this.http.post<{ data: MiJuntaSuscripcion }>(`${this.base}/suscripcion`, {
      planId,
      diasPrueba,
      periodo,
    });
  }

  actualizarSuscripcion(body: {
    planId?: string;
    periodo?: 'mensual' | 'anual';
    overrideLimiteUsuarios?: number | null;
    overrideLimiteStorageMb?: number | null;
    overrideLimiteCartasMes?: number | null;
    motivoPersonalizacion?: string | null;
  }): Observable<{ data: MiJuntaSuscripcion }> {
    return this.http.patch<{ data: MiJuntaSuscripcion }>(`${this.base}/suscripcion`, body);
  }
}
