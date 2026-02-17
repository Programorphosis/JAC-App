import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatTabsModule } from '@angular/material/tabs';
import { NgClass } from '@angular/common';
import { DecimalPipe } from '@angular/common';
import { FormatearFechaPipe } from '../../../../shared/pipes/formatear-fecha.pipe';
import { FormatearFechaHoraPipe } from '../../../../shared/pipes/formatear-fecha-hora.pipe';
import type { FacturaItem, PagoFacturaItem, EstadoFactura } from '../../services/platform-facturas.service';
import type { JuntaDetalle } from '../../services/platform-juntas.service';

@Component({
  selector: 'app-junta-facturacion-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatTableModule,
    MatTabsModule,
    NgClass,
    DecimalPipe,
    FormatearFechaPipe,
    FormatearFechaHoraPipe,
  ],
  templateUrl: './junta-facturacion-card.component.html',
  styleUrl: './junta-facturacion-card.component.scss',
})
export class JuntaFacturacionCardComponent {
  @Input({ required: true }) junta!: JuntaDetalle;
  @Input() facturas: FacturaItem[] = [];
  @Input() facturasMeta: { page: number; limit: number; total: number; totalPages: number } | null = null;
  @Input() loadingFacturas = false;
  @Input() pagosPlataforma: PagoFacturaItem[] = [];
  @Input() pagosMeta: { page: number; limit: number; total: number; totalPages: number } | null = null;
  @Input() loadingPagos = false;

  @Output() crearFactura = new EventEmitter<void>();
  @Output() registrarPago = new EventEmitter<FacturaItem>();
  @Output() cancelarFactura = new EventEmitter<FacturaItem>();
  @Output() reactivarFactura = new EventEmitter<FacturaItem>();
  @Output() cargarFacturas = new EventEmitter<number>();
  @Output() cargarPagos = new EventEmitter<number>();

  puedeRegistrarPago(f: FacturaItem): boolean {
    if (f.estado === 'PAGADA' || f.estado === 'CANCELADA') return false;
    const pagado = f.pagos.reduce((s, p) => s + p.monto, 0);
    return pagado < f.monto;
  }

  puedeCancelarFactura(f: FacturaItem): boolean {
    return f.estado === 'PENDIENTE' || f.estado === 'VENCIDA' || f.estado === 'PARCIAL';
  }

  puedeReactivarFactura(f: FacturaItem): boolean {
    if (f.estado !== 'CANCELADA') return false;
    const pagado = f.pagos.reduce((s, p) => s + p.monto, 0);
    if (pagado > 0) return false;
    return new Date(f.fechaVencimiento) >= new Date();
  }

  claseEstadoFactura(estado: EstadoFactura): string {
    switch (estado) {
      case 'PAGADA':
        return 'text-green-700';
      case 'PENDIENTE':
        return 'text-amber-700';
      case 'VENCIDA':
        return 'text-red-700';
      case 'PARCIAL':
        return 'text-blue-700';
      case 'CANCELADA':
        return 'text-gray-600';
      default:
        return '';
    }
  }
}
