import { Component, Input, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartasService, EstadoGeneralResult, CartaItem } from '../../cartas/services/cartas.service';

@Component({
  selector: 'app-usuario-cartas',
  standalone: true,
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './usuario-cartas.component.html',
  styleUrl: './usuario-cartas.component.scss',
})
export class UsuarioCartasComponent implements OnInit {
  @Input() usuarioId!: string;
  estado: EstadoGeneralResult | null = null;
  cartas: CartaItem[] = [];
  loading = false;
  solicitando = false;

  constructor(
    private readonly cartasSvc: CartasService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.usuarioId) {
      this.cargar();
    }
  }

  cargar(): void {
    this.loading = true;
    this.cartasSvc.getEstadoGeneral(this.usuarioId).subscribe({
      next: (e) => {
        this.estado = e;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
    this.cartasSvc.listarPorUsuario(this.usuarioId).subscribe({
      next: (c) => (this.cartas = c),
    });
  }

  puedeSolicitar(): boolean {
    if (!this.estado) return false;
    if (this.estado.deuda_junta > 0) return false;
    if (!this.estado.pago_carta) return false;
    const requisitosOk = this.estado.requisitos.every(
      (r) => !r.obligacionActiva || r.estado === 'AL_DIA'
    );
    if (!requisitosOk) return false;
    const pendiente = this.cartas.some((c) => c.estado === 'PENDIENTE');
    return !pendiente;
  }

  solicitar(): void {
    this.solicitando = true;
    this.cartasSvc.solicitar(this.usuarioId).subscribe({
      next: () => {
        this.solicitando = false;
        this.snackBar.open('Carta solicitada', 'Cerrar', { duration: 2000 });
        this.cargar();
      },
      error: (err) => {
        this.solicitando = false;
        this.snackBar.open(err.error?.error?.message || err.error?.message || 'Error', 'Cerrar', {
          duration: 5000,
        });
      },
    });
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }

  formatearFecha(f: string): string {
    return new Date(f).toLocaleDateString('es-CO');
  }
}
