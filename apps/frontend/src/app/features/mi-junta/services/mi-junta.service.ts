import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';

export interface MiJuntaSuscripcion {
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

  actualizarWompi(body: ActualizarWompiBody): Observable<{ ok: boolean }> {
    return this.http.patch<{ ok: boolean }>(`${this.base}/wompi`, body);
  }
}
