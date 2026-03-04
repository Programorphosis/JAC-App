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
  templateUrl: './factura-pendiente-modal.component.html',
  styleUrl: './factura-pendiente-modal.component.scss',
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
    this.router.navigate(['/app/facturas-plataforma']);
  }

  cerrar(): void {
    this.dialogRef.close(false);
  }
}
