import { Component, OnInit, computed, signal } from '@angular/core';
import { NgClass } from '@angular/common';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth.service';
import { UsuariosService, DeudaResult } from '../../usuarios/services/usuarios.service';
import { CartasService, EstadoGeneralResult, CartaItem } from '../../cartas/services/cartas.service';
import { formatearNombre } from '../../../shared/utils/formatear-nombre.util';

export interface Shortcut {
  icon: string;
  title: string;
  description: string;
  link: string[];
  queryParams?: Record<string, string>;
  color?: string;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, RouterLink, NgClass],
  templateUrl: './dashboard.component.html',
  styleUrl: './dashboard.component.scss',
})
export class DashboardComponent implements OnInit {
  deuda = signal<DeudaResult | null>(null);
  estadoCarta = signal<EstadoGeneralResult | null>(null);
  cartas = signal<CartaItem[]>([]);
  loading = false;

  constructor(
    readonly auth: AuthService,
    private readonly usuarios: UsuariosService,
    private readonly cartasSvc: CartasService
  ) {}

  /** Accesos directos según permisos del usuario. */
  readonly shortcuts = computed<Shortcut[]>(() => {
    const list: Shortcut[] = [];
    const p = this.auth.permissions;

    // Mi cuenta – siempre visible
    list.push({
      icon: 'person',
      title: 'Mi cuenta',
      description: 'Ver tu perfil, deuda, historial laboral, requisitos, cartas y documentos.',
      link: ['/usuarios', this.auth.currentUser()?.id ?? ''],
      color: 'primary',
    });

    // Pagos – dashboard contable (solo TESORERA)
    if (this.auth.can(p.PAGOS_GESTIONAR)) {
      list.push({
        icon: 'analytics',
        title: 'Dashboard contable',
        description: 'Resumen de ingresos por método, tipo, mes y año. Efectivo, transferencia y online.',
        link: ['/pagos'],
        queryParams: {},
        color: 'accent',
      });
    }

    // Registrar pagos (TESORERA)
    if (this.auth.can(p.PAGOS_GESTIONAR)) {
      list.push({
        icon: 'payment',
        title: 'Registrar pagos',
        description: 'Registrar pagos en efectivo o transferencia. Cuota junta y cartas.',
        link: ['/pagos'],
        queryParams: { tab: 'registrar' },
        color: 'primary',
      });
    }

    // Pagar mi deuda online (AFILIADO, SECRETARIA)
    const d = this.deuda();
    if (this.auth.can(p.PAGOS_PAGAR_ONLINE_PROPIO) && d && d.total > 0) {
      list.push({
        icon: 'credit_card',
        title: 'Pagar mi deuda',
        description: `Tienes deuda de ${this.formatearMoneda(d.total)}. Paga online con tarjeta o PSE.`,
        link: ['/usuarios', this.auth.currentUser()?.id ?? ''],
        queryParams: { tab: 'deuda' },
        color: 'accent',
      });
    }

    // Usuarios
    if (this.auth.can(p.USUARIOS_VER)) {
      list.push({
        icon: 'people',
        title: 'Usuarios',
        description: 'Listado de usuarios de la junta. Crear, editar y gestionar.',
        link: ['/usuarios'],
      });
      if (this.auth.can(p.USUARIOS_CREAR)) {
        list.push({
          icon: 'person_add',
          title: 'Nuevo usuario',
          description: 'Registrar un nuevo afiliado o asignar roles operativos.',
          link: ['/usuarios/nuevo'],
          color: 'accent',
        });
      }
    }

    // Cartas (SECRETARIA)
    if (this.auth.can(p.CARTAS_VALIDAR)) {
      list.push({
        icon: 'mail',
        title: 'Cartas pendientes',
        description: 'Validar y aprobar solicitudes de cartas laborales.',
        link: ['/cartas'],
        color: 'primary',
      });
    }

    // Solicitar carta (AFILIADO cuando puede)
    if (this.auth.can(p.CARTAS_SOLICITAR) && this.puedeSolicitarCarta()) {
      list.push({
        icon: 'description',
        title: 'Solicitar carta',
        description: 'Tu estado está al día. Solicita tu carta laboral.',
        link: ['/usuarios', this.auth.currentUser()?.id ?? ''],
        queryParams: { tab: 'cartas' },
        color: 'accent',
      });
    }

    // Requisitos (ADMIN, modificadores)
    if (this.auth.can(p.REQUISITOS_VER)) {
      list.push({
        icon: 'assignment',
        title: 'Requisitos',
        description: 'Tipos de requisitos (agua, basura). Configurar obligaciones y modificadores.',
        link: ['/requisitos'],
      });
    }

    // Tarifas
    if (this.auth.can(p.TARIFAS_VER)) {
      list.push({
        icon: 'attach_money',
        title: 'Tarifas',
        description: 'Tarifas de cuota por estado laboral. Consultar o modificar.',
        link: ['/tarifas'],
      });
    }

    // Auditorías
    if (this.auth.can(p.AUDITORIAS_VER)) {
      list.push({
        icon: 'history',
        title: 'Auditorías',
        description: 'Historial de acciones. Pagos, cartas, usuarios, documentos.',
        link: ['/auditorias'],
      });
    }

    return list;
  });

  /** Mensaje de bienvenida según rol. */
  readonly mensajeBienvenida = computed(() => {
    const u = this.auth.currentUser();
    const nombre = u?.nombres ? formatearNombre(u.nombres.split(' ')[0]) : 'Usuario';
    if (this.auth.isPlatformAdmin()) return `Panel de administración`;
    if (this.auth.hasRole('ADMIN') && this.auth.esAdminSolo()) return `Configuración de la junta`;
    if (this.auth.hasRole('TESORERA')) return `Gestión de pagos e ingresos`;
    if (this.auth.hasRole('SECRETARIA')) return `Gestión de cartas y usuarios`;
    if (this.auth.hasRole('RECEPTOR_AGUA') || (this.auth.currentUser()?.esModificador ?? false)) return `Gestión de requisitos asignados`;
    return `Bienvenido, ${nombre}`;
  });

  ngOnInit(): void {
    const user = this.auth.currentUser();
    if (user?.id && this.auth.hasRole('AFILIADO') && !this.auth.esAdminSolo()) {
      this.loading = true;
      this.usuarios.getDeuda(user.id, true).subscribe({
        next: (d) => {
          this.deuda.set(d);
          this.loading = false;
        },
        error: () => (this.loading = false),
      });
      this.cartasSvc.getEstadoGeneral(user.id).subscribe({
        next: (e) => this.estadoCarta.set(e),
      });
      this.cartasSvc.listarPorUsuario(user.id).subscribe({
        next: (c) => this.cartas.set(c),
      });
    }
  }

  cartasAprobadas(): CartaItem[] {
    return this.cartas().filter((c) => c.estado === 'APROBADA');
  }

  linkMiCuentaCartas(): string[] {
    const id = this.auth.currentUser()?.id;
    return id ? ['/usuarios', id] : ['/'];
  }

  esAfiliado(): boolean {
    return this.auth.hasRole('AFILIADO') && !this.auth.esAdminSolo();
  }

  esAdminSolo(): boolean {
    return this.auth.esAdminSolo();
  }

  get myId(): string | undefined {
    return this.auth.currentUser()?.id;
  }

  puedeSolicitarCarta(): boolean {
    const e = this.estadoCarta();
    if (!e) return false;
    if (e.deuda_junta > 0) return false;
    if (!e.pago_carta) return false;
    return e.requisitos.every((r) => !r.obligacionActiva || r.estado === 'AL_DIA');
  }

  mensajeEstadoCarta(): string {
    const e = this.estadoCarta();
    if (!e) return '';
    if (e.deuda_junta > 0) return 'Debe pagar su deuda de la junta.';
    if (!e.pago_carta) return 'Debe pagar la carta.';
    const requisitosNoOk = e.requisitos.filter(
      (r) => r.obligacionActiva && r.estado !== 'AL_DIA'
    );
    if (requisitosNoOk.length > 0) return 'Debe regularizar requisitos con la junta.';
    return 'Puede solicitar carta.';
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }
}
