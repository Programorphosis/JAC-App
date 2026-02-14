import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { environment } from '../../../../environments/environment';

export interface RegistrarPagoEfectivoBody {
  usuarioId: string;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA';
  referenciaExterna?: string;
}

export interface RegistrarPagoCartaBody {
  usuarioId: string;
  metodo: 'EFECTIVO' | 'TRANSFERENCIA';
  referenciaExterna?: string;
}

export interface IntencionPagoResult {
  checkoutUrl: string;
  referencia: string;
  monto: number;
  montoCents: number;
}

export interface VerificarPagoResult {
  registrado: boolean;
  pagoId?: string;
  monto?: number;
  consecutivo?: number;
  status?: string;
}

@Injectable({ providedIn: 'root' })
export class PagosService {
  private readonly base = `${environment.apiUrl}/pagos`;

  constructor(private readonly http: HttpClient) {}

  registrarEfectivo(body: RegistrarPagoEfectivoBody): Observable<{ pagoId: string; monto: number; consecutivo: number }> {
    return this.http
      .post<{ data: { pagoId: string; monto: number; consecutivo: number } }>(this.base, body)
      .pipe(map((r) => r.data));
  }

  registrarCarta(body: RegistrarPagoCartaBody): Observable<{ pagoId: string; monto: number; consecutivo: number }> {
    return this.http
      .post<{ data: { pagoId: string; monto: number; consecutivo: number } }>(`${this.base}/carta`, body)
      .pipe(map((r) => r.data));
  }

  crearIntencionOnline(usuarioId: string): Observable<IntencionPagoResult> {
    return this.http
      .post<{ data: IntencionPagoResult }>(`${this.base}/online/intencion`, { usuarioId })
      .pipe(map((r) => r.data));
  }

  crearIntencionCartaOnline(usuarioId: string): Observable<IntencionPagoResult> {
    return this.http
      .post<{ data: IntencionPagoResult }>(`${this.base}/carta/online/intencion`, { usuarioId })
      .pipe(map((r) => r.data));
  }

  verificarPagoOnline(transactionId: string): Observable<VerificarPagoResult> {
    return this.http
      .get<{ data: VerificarPagoResult }>(`${this.base}/online/verificar`, {
        params: { transaction_id: transactionId },
      })
      .pipe(map((r) => r.data));
  }
}
