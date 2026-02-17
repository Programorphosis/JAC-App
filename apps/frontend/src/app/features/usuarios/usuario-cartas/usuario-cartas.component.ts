import { Component, Input, OnInit } from '@angular/core';
import { NgClass } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartasService, EstadoGeneralResult, CartaItem } from '../../cartas/services/cartas.service';
import { PagosService } from '../../pagos/services/pagos.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AppCanDirective } from '../../../core/auth/app-can.directive';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';

@Component({
  selector: 'app-usuario-cartas',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, NgClass, AppCanDirective, FormatearFechaPipe],
  templateUrl: './usuario-cartas.component.html',
  styleUrl: './usuario-cartas.component.scss',
})
export class UsuarioCartasComponent implements OnInit {
  @Input() usuarioId!: string;
  estado: EstadoGeneralResult | null = null;
  cartas: CartaItem[] = [];
  loading = false;
  solicitando = false;
  pagandoDeuda = false;
  pagandoCarta = false;
  descargandoCartaId: string | null = null;

  constructor(
    private readonly cartasSvc: CartasService,
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
    if (pendiente) return false;
    if (this.tieneCartaVigente()) return false;
    return true;
  }

  tieneCartaVigente(): boolean {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return this.cartas.some(
      (c) =>
        c.estado === 'APROBADA' &&
        c.vigenciaHasta &&
        new Date(c.vigenciaHasta) >= hoy
    );
  }

  cartaVigente(): CartaItem | null {
    const hoy = new Date();
    hoy.setHours(0, 0, 0, 0);
    return (
      this.cartas.find(
        (c) =>
          c.estado === 'APROBADA' &&
          c.vigenciaHasta &&
          new Date(c.vigenciaHasta) >= hoy
      ) ?? null
    );
  }

  tieneCartaPendiente(): boolean {
    return this.cartas.some((c) => c.estado === 'PENDIENTE');
  }

  /** Cartas aprobadas (más reciente primero) para sección destacada de descarga */
  cartasAprobadas(): CartaItem[] {
    return this.cartas
      .filter((c) => c.estado === 'APROBADA')
      .sort((a, b) => new Date(b.fechaSolicitud).getTime() - new Date(a.fechaSolicitud).getTime());
  }

  requisitosNoAlDia(): Array<{ nombre: string; estado: string }> {
    if (!this.estado) return [];
    return this.estado.requisitos
      .filter((r) => r.obligacionActiva && r.estado !== 'AL_DIA')
      .map((r) => ({ nombre: r.nombre, estado: r.estado }));
  }

  pagarDeudaOnline(): void {
    if (!this.usuarioId || this.pagandoDeuda) return;
    this.pagandoDeuda = true;
    this.pagos.crearIntencionOnline(this.usuarioId).subscribe({
      next: (r) => {
        this.pagandoDeuda = false;
        if (r.checkoutUrl) {
          window.location.href = r.checkoutUrl;
        } else {
          this.snackBar.open('No se obtuvo URL de pago', 'Cerrar', { duration: 3000 });
        }
      },
      error: (err) => {
        this.pagandoDeuda = false;
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
  }

  pagarCartaOnline(): void {
    if (!this.usuarioId || this.pagandoCarta) return;
    this.pagandoCarta = true;
    this.pagos.crearIntencionCartaOnline(this.usuarioId).subscribe({
      next: (r) => {
        this.pagandoCarta = false;
        if (r.checkoutUrl) {
          window.location.href = r.checkoutUrl;
        } else {
          this.snackBar.open('No se obtuvo URL de pago', 'Cerrar', { duration: 3000 });
        }
      },
      error: (err) => {
        this.pagandoCarta = false;
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
  }

  descargarCartaPdf(carta: CartaItem): void {
    if (carta.estado !== 'APROBADA' || this.descargandoCartaId) return;
    this.descargandoCartaId = carta.id;
    this.cartasSvc.getUrlDescargaCarta(carta.id).subscribe({
      next: (res) => {
        this.descargandoCartaId = null;
        if (res.url) {
          window.open(res.url, '_blank');
        }
      },
      error: (err) => {
        this.descargandoCartaId = null;
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
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
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }

}
