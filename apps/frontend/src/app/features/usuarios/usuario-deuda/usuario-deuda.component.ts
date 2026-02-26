import { Component, Input, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RouterLink } from '@angular/router';
import { UsuariosService, DeudaResult } from '../services/usuarios.service';
import { PagosService } from '../../pagos/services/pagos.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AppCanDirective } from '../../../core/auth/app-can.directive';
import { getApiErrorMessage, getApiErrorCode } from '../../../shared/utils/api-error.util';

@Component({
  selector: 'app-usuario-deuda',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, NgClass, AppCanDirective, RouterLink],
  templateUrl: './usuario-deuda.component.html',
  styleUrl: './usuario-deuda.component.scss',
})
export class UsuarioDeudaComponent implements OnInit {
  @Input() usuarioId!: string;
  deuda: DeudaResult | null = null;
  loading = false;
  pagando = false;
  /** Error al cargar deuda. Si code=SIN_TARIFA_VIGENTE, mostrar mensaje amigable + enlace. */
  errorDeuda: { mensaje: string; sinTarifa?: boolean } | null = null;

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly pagos: PagosService,
    private readonly snackBar: MatSnackBar,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    if (this.usuarioId) {
      this.cargar();
    }
  }

  cargar(): void {
    this.loading = true;
    this.errorDeuda = null;
    this.usuarios.getDeuda(this.usuarioId, true).subscribe({
      next: (d: DeudaResult) => {
        this.deuda = d;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        const code = getApiErrorCode(err);
        const mensaje = getApiErrorMessage(err);
        this.errorDeuda = {
          mensaje,
          sinTarifa: code === 'SIN_TARIFA_VIGENTE',
        };
      },
    });
  }

  pagarDeudaOnline(): void {
    if (!this.usuarioId || this.pagando) return;
    this.pagando = true;
    this.pagos.crearIntencionOnline(this.usuarioId).subscribe({
      next: (r) => {
        this.pagando = false;
        if (r.checkoutUrl) {
          window.location.href = r.checkoutUrl;
        } else {
          this.snackBar.open('No se obtuvo URL de pago', 'Cerrar', { duration: 3000 });
        }
      },
      error: (err) => {
        this.pagando = false;
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }


  formatearMes(year: number, month: number): string {
    const m = String(month).padStart(2, '0');
    return `${year}-${m}`;
  }
}
