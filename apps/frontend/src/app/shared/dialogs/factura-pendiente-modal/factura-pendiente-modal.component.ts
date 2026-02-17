import { Component, Inject } from '@angular/core';
import { Router } from '@angular/router';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe, NgClass } from '@angular/common';
import { FormatearFechaPipe } from '../../pipes/formatear-fecha.pipe';

export interface FacturaPendienteModalData {
  facturas: Array<{
    id: string;
    monto: number;
    fechaVencimiento: string;
    estado: string;
    pagos: Array<{ monto: number }>;
  }>;
}

/**
 * Modal para mostrar facturas pendientes al iniciar sesión.
 * Estilo similar a aviso-modal pero independiente (sin dependencia entre módulos).
 */
@Component({
  selector: 'app-factura-pendiente-modal',
  standalone: true,
  imports: [
    MatDialogModule,
    MatButtonModule,
    MatIconModule,
    DecimalPipe,
    NgClass,
    FormatearFechaPipe,
  ],
  template: `
    <div class="factura-pendiente-modal">
      <div class="factura-pendiente-modal-glow"></div>
      <div class="factura-pendiente-modal-content">
        <div class="factura-pendiente-modal-header">
          <div class="factura-pendiente-modal-icon">
            <mat-icon fontIcon="receipt_long" class="!text-4xl !w-12 !h-12"></mat-icon>
          </div>
          <h2 class="factura-pendiente-modal-title">Facturas pendientes</h2>
          <p class="factura-pendiente-modal-subtitle">
            Su junta tiene {{ data.facturas.length }} factura(s) pendiente(s) de pago a la plataforma.
          </p>
        </div>
        <div class="factura-pendiente-modal-body">
          <ul class="space-y-2">
            @for (f of data.facturas; track f.id) {
              <li class="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                <span class="text-gray-700">
                  {{ f.fechaVencimiento | formatearFecha }} · {{ montoPendiente(f) | number }} COP
                </span>
                <span class="text-xs font-medium px-2 py-0.5 rounded"
                  [ngClass]="{
                    'bg-amber-100 text-amber-800': f.estado === 'PENDIENTE',
                    'bg-red-100 text-red-800': f.estado === 'VENCIDA',
                    'bg-blue-100 text-blue-800': f.estado === 'PARCIAL'
                  }">
                  {{ f.estado }}
                </span>
              </li>
            }
          </ul>
        </div>
        <div class="factura-pendiente-modal-actions">
          <button mat-raised-button color="primary" (click)="irAVer()" class="factura-pendiente-modal-btn">
            <mat-icon fontIcon="visibility" class="!text-lg !w-5 !h-5 mr-1"></mat-icon>
            Ver facturas
          </button>
          <button mat-button (click)="cerrar()">
            Cerrar
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .factura-pendiente-modal {
      position: relative;
      min-width: 320px;
      max-width: 480px;
      border-radius: 16px;
      overflow: hidden;
    }

    .factura-pendiente-modal-glow {
      position: absolute;
      inset: -2px;
      background: linear-gradient(135deg, #b45309 0%, #d97706 25%, #f59e0b 50%, #fbbf24 100%);
      border-radius: 18px;
      z-index: 0;
      opacity: 0.12;
    }

    .factura-pendiente-modal-content {
      position: relative;
      z-index: 1;
      background: linear-gradient(180deg, #ffffff 0%, #fffbeb 100%);
      border-radius: 16px;
      border: 1px solid rgba(180, 83, 9, 0.2);
      box-shadow: 0 8px 32px rgba(180, 83, 9, 0.1), 0 2px 8px rgba(0, 0, 0, 0.06);
    }

    .factura-pendiente-modal-header {
      padding: 1.5rem 1.5rem 0.75rem;
      text-align: center;
    }

    .factura-pendiente-modal-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      background: linear-gradient(135deg, #b45309 0%, #d97706 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(180, 83, 9, 0.35);
    }

    .factura-pendiente-modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #b45309;
      margin: 0;
      line-height: 1.3;
    }

    .factura-pendiente-modal-subtitle {
      font-size: 0.875rem;
      color: #6b7280;
      margin: 0.5rem 0 0;
    }

    .factura-pendiente-modal-body {
      padding: 0 1.5rem 1rem;
      max-height: 200px;
      overflow-y: auto;
    }

    .factura-pendiente-modal-actions {
      padding: 0 1.5rem 1.5rem;
      display: flex;
      justify-content: center;
      gap: 0.5rem;
      flex-wrap: wrap;
    }

    .factura-pendiente-modal-btn {
      min-width: 140px;
    }
  `],
})
export class FacturaPendienteModalComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<FacturaPendienteModalComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: FacturaPendienteModalData,
    private readonly router: Router
  ) {}

  montoPendiente(f: FacturaPendienteModalData['facturas'][0]): number {
    const pagado = f.pagos.reduce((s, p) => s + p.monto, 0);
    return f.monto - pagado;
  }

  irAVer(): void {
    this.dialogRef.close(true);
    this.router.navigate(['/facturas-plataforma']);
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
