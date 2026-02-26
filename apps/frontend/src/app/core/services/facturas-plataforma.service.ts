import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, map } from 'rxjs';
import { environment } from '../../../environments/environment';

export type EstadoFacturaJunta =
  | 'PENDIENTE'
  | 'PAGADA'
  | 'PARCIAL'
  | 'VENCIDA'
  | 'CANCELADA';

export interface FacturaPlataformaItem {
  id: string;
  juntaId: string;
  monto: number;
  fechaEmision: string;
  fechaVencimiento: string;
  estado: EstadoFacturaJunta;
  tipo: string;
  suscripcion?: { id: string; plan: { nombre: string } } | null;
  pagos: Array<{ id: string; monto: number }>;
}

export interface PaginatedFacturasPlataforma {
  data: FacturaPlataformaItem[];
  meta: { page: number; limit: number; total: number; totalPages: number };
}

/**
 * Facturas de la plataforma vistas por la junta (admin, tesorera, secretaria).
 * GET /api/facturas-plataforma – solo lectura.
 */
@Injectable({ providedIn: 'root' })
export class FacturasPlataformaService {
  private readonly base = `${environment.apiUrl}/facturas-plataforma`;

  constructor(private readonly http: HttpClient) {}

  listar(
    page = 1,
    limit = 20,
    estado?: EstadoFacturaJunta
  ): Observable<PaginatedFacturasPlataforma> {
    let params = new HttpParams().set('page', page).set('limit', limit);
    if (estado) params = params.set('estado', estado);
    return this.http.get<PaginatedFacturasPlataforma>(this.base, { params });
  }

  listarPendientes(): Observable<FacturaPlataformaItem[]> {
    return this.http
      .get<{ data: FacturaPlataformaItem[] }>(`${this.base}/pendientes`)
      .pipe(map((r) => r.data));
  }

  /** Crea intención de pago online. Redirige a checkout Wompi. */
  crearIntencionPago(facturaId: string): Observable<{ checkoutUrl: string; referencia: string }> {
    return this.http.post<{ checkoutUrl: string; referencia: string }>(
      `${this.base}/intencion`,
      { facturaId },
    );
  }

  /**
   * Crea factura + intención para suscripción sin trial.
   * Redirige a Wompi; al pagar se crea la Suscripción.
   */
  crearIntencionSuscripcion(params: {
    planId: string;
    periodo?: 'mensual' | 'anual';
    diasPrueba?: number;
  }): Observable<{ checkoutUrl: string; referencia: string; facturaId: string }> {
    return this.http.post<{ checkoutUrl: string; referencia: string; facturaId: string }>(
      `${this.base}/intencion-suscripcion`,
      params,
    );
  }

  /** Crea factura + intención para upgrade. Al pagar se actualiza la Suscripción. */
  crearIntencionUpgrade(params: {
    suscripcionId: string;
    planId: string;
    periodo?: 'mensual' | 'anual';
  }): Observable<{ checkoutUrl: string; referencia: string; facturaId: string }> {
    return this.http.post<{ checkoutUrl: string; referencia: string; facturaId: string }>(
      `${this.base}/intencion-upgrade`,
      params,
    );
  }

  /** Crea factura + intención para overrides. Al pagar se aplican los overrides. */
  crearIntencionOverrides(params: {
    suscripcionId: string;
    overrideLimiteUsuarios?: number | null;
    overrideLimiteStorageMb?: number | null;
    overrideLimiteCartasMes?: number | null;
    motivoPersonalizacion?: string | null;
  }): Observable<{ checkoutUrl: string; referencia: string; facturaId: string }> {
    return this.http.post<{ checkoutUrl: string; referencia: string; facturaId: string }>(
      `${this.base}/intencion-overrides`,
      params,
    );
  }

  /** Abre comprobante de factura en ventana nueva (imprimible / guardar como PDF). */
  abrirComprobante(f: FacturaPlataformaItem, nombreJunta: string): void {
    const pagado = f.pagos.reduce((s, p) => s + p.monto, 0);
    const pendiente = f.monto - pagado;
    const fmt = (n: number) =>
      new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP', minimumFractionDigits: 0 }).format(n);
    const fmtFecha = (d: string) =>
      new Date(d).toLocaleDateString('es-CO', { year: 'numeric', month: 'long', day: 'numeric' });
    const tipoLabel: Record<string, string> = {
      SUSCRIPCION: 'Renovación de suscripción',
      OVERRIDES: 'Exceso de capacidad',
      UPGRADE: 'Cambio de plan',
    };
    const estadoLabel: Record<string, string> = {
      PENDIENTE: 'Pendiente', PAGADA: 'Pagada', PARCIAL: 'Parcial',
      VENCIDA: 'Vencida', CANCELADA: 'Cancelada',
    };
    const html = `<!DOCTYPE html><html lang="es"><head><meta charset="utf-8">
<title>Comprobante Factura ${f.id.slice(-8).toUpperCase()}</title>
<style>body{font-family:Arial,sans-serif;max-width:600px;margin:40px auto;color:#1f2937;font-size:14px}
h1{font-size:20px;color:#1d4ed8;border-bottom:2px solid #1d4ed8;padding-bottom:8px}
table{width:100%;border-collapse:collapse;margin:16px 0}
th{background:#f3f4f6;padding:8px;text-align:left;font-size:12px;text-transform:uppercase;color:#6b7280}
td{padding:8px;border-bottom:1px solid #e5e7eb}
.badge{display:inline-block;padding:2px 10px;border-radius:9999px;font-size:12px;font-weight:600}
.PAGADA{background:#d1fae5;color:#065f46}.PENDIENTE{background:#fef3c7;color:#92400e}
.VENCIDA{background:#fee2e2;color:#991b1b}.PARCIAL{background:#dbeafe;color:#1e40af}
.CANCELADA{background:#f3f4f6;color:#6b7280}
.total{font-size:16px;font-weight:bold;text-align:right;margin-top:8px}
@media print{body{margin:16px}button{display:none}}</style></head><body>
<h1>Comprobante de Factura</h1>
<p><strong>Junta:</strong> ${nombreJunta}</p>
<p><strong>No. Factura:</strong> ${f.id.slice(-8).toUpperCase()} &nbsp; <strong>Tipo:</strong> ${tipoLabel[f.tipo] ?? f.tipo}</p>
<p><strong>Plan:</strong> ${f.suscripcion?.plan?.nombre ?? '—'}</p>
<p><strong>Fecha emisión:</strong> ${fmtFecha(f.fechaEmision)} &nbsp; <strong>Vence:</strong> ${fmtFecha(f.fechaVencimiento)}</p>
<p><strong>Estado:</strong> <span class="badge ${f.estado}">${estadoLabel[f.estado] ?? f.estado}</span></p>
<table><thead><tr><th>Concepto</th><th style="text-align:right">Monto</th></tr></thead>
<tbody><tr><td>${tipoLabel[f.tipo] ?? f.tipo}${f.suscripcion?.plan?.nombre ? ' — ' + f.suscripcion.plan.nombre : ''}</td><td style="text-align:right">${fmt(f.monto)}</td></tr></tbody></table>
${f.pagos.length > 0 ? `<table><thead><tr><th>Pagos registrados</th><th style="text-align:right">Monto</th></tr></thead><tbody>
${f.pagos.map((p) => `<tr><td>Pago ${p.id.slice(-8).toUpperCase()}</td><td style="text-align:right">${fmt(p.monto)}</td></tr>`).join('')}
</tbody></table>` : ''}
<p class="total">Total pagado: ${fmt(pagado)}</p>
${pendiente > 0 ? `<p class="total" style="color:#b91c1c">Saldo pendiente: ${fmt(pendiente)}</p>` : ''}
<p style="margin-top:32px;font-size:11px;color:#9ca3af">Generado el ${new Date().toLocaleString('es-CO')} · Sistema JAC</p>
<button onclick="window.print()" style="margin-top:16px;padding:8px 20px;background:#1d4ed8;color:#fff;border:none;border-radius:6px;cursor:pointer">Imprimir / Guardar PDF</button>
</body></html>`;
    const win = window.open('', '_blank');
    if (win) { win.document.write(html); win.document.close(); }
  }

  /** Verifica pago tras retorno de Wompi. */
  verificarPago(
    facturaId: string,
    transactionId: string,
  ): Observable<{ registrado: boolean; codigo: string; mensaje: string; estado?: string }> {
    return this.http.get<{
      registrado: boolean;
      codigo: string;
      mensaje: string;
      estado?: string;
    }>(`${this.base}/verificar`, {
      params: { factura_id: facturaId, transaction_id: transactionId },
    });
  }
}
