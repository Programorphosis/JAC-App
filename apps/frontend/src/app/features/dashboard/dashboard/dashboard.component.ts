import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { AuthService } from '../../../core/auth/auth.service';
import { UsuariosService, DeudaResult } from '../../usuarios/services/usuarios.service';
import { CartasService, EstadoGeneralResult, CartaItem } from '../../cartas/services/cartas.service';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, RouterLink],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  deuda: DeudaResult | null = null;
  estadoCarta: EstadoGeneralResult | null = null;
  cartas: CartaItem[] = [];
  loading = false;

  constructor(
    readonly auth: AuthService,
    private readonly usuarios: UsuariosService,
    private readonly cartasSvc: CartasService
  ) {}

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user?.id && this.auth.hasRole('CIUDADANO')) {
      this.loading = true;
      this.usuarios.getDeuda(user.id, true).subscribe({
        next: (d) => {
          this.deuda = d;
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
      this.cartasSvc.getEstadoGeneral(user.id).subscribe({
        next: (e) => (this.estadoCarta = e),
      });
      this.cartasSvc.listarPorUsuario(user.id).subscribe({
        next: (c) => (this.cartas = c),
      });
    }
  }

  cartasAprobadas(): CartaItem[] {
    return this.cartas.filter((c) => c.estado === 'APROBADA');
  }

  linkMiCuentaCartas(): string[] {
    const id = this.myId;
    return id ? ['/usuarios', id] : ['/'];
  }

  esCiudadano(): boolean {
    return this.auth.hasRole('CIUDADANO');
  }

  get myId(): string | undefined {
    return this.auth.currentUser()?.id;
  }

  puedeSolicitarCarta(): boolean {
    if (!this.estadoCarta) return false;
    if (this.estadoCarta.deuda_junta > 0) return false;
    if (!this.estadoCarta.pago_carta) return false;
    return this.estadoCarta.requisitos.every(
      (r) => !r.obligacionActiva || r.estado === 'AL_DIA'
    );
  }

  mensajeEstadoCarta(): string {
    if (!this.estadoCarta) return '';
    if (this.estadoCarta.deuda_junta > 0) return 'Debe pagar su deuda de la junta.';
    if (!this.estadoCarta.pago_carta) return 'Debe pagar la carta.';
    const requisitosNoOk = this.estadoCarta.requisitos.filter(
      (r) => r.obligacionActiva && r.estado !== 'AL_DIA'
    );
    if (requisitosNoOk.length > 0) return 'Debe regularizar requisitos con la junta.';
    return 'Puede solicitar carta.';
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }
}
