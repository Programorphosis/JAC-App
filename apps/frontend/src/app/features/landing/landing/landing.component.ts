import { Component, OnInit, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { trigger, transition, style, animate } from '@angular/animations';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { NgFor } from '@angular/common';
import { AuthService } from '../../../core/auth/auth.service';
import { InViewDirective } from '../../../shared/directives/in-view.directive';
import { LandingPlanesService, type PlanPublico } from '../services/landing-planes.service';

@Component({
  selector: 'app-landing',
  standalone: true,
  imports: [
    RouterLink,
    MatButtonModule,
    MatIconModule,
    NgFor,
    InViewDirective,
  ],
  templateUrl: './landing.component.html',
  styleUrl: './landing.component.scss',
  animations: [
    trigger('fadeInUp', [
      transition(':enter', [
        style({ opacity: 0, transform: 'translateY(24px)' }),
        animate('600ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
      ]),
    ]),
  ],
})
export class LandingComponent implements OnInit {
  readonly features = [
    {
      icon: 'payment',
      title: 'Pagos y cuotas',
      description: 'Registro de pagos efectivo, transferencia y online. Cálculo automático de deuda.',
    },
    {
      icon: 'mail',
      title: 'Cartas y constancias',
      description: 'Solicitud, aprobación y emisión de cartas con validación QR.',
    },
    {
      icon: 'assignment',
      title: 'Requisitos adicionales',
      description: 'Gestión de obligaciones como agua, aseo y más. Estados al día o en mora.',
    },
    {
      icon: 'history',
      title: 'Auditoría',
      description: 'Registro inmutable de todas las operaciones. Listo para inspecciones.',
    },
  ];

  planes = signal<PlanPublico[]>([]);
  planesLoading = signal(true);

  constructor(
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly title: Title,
    private readonly meta: Meta,
    private readonly planesService: LandingPlanesService,
  ) {}

  formatPrice(value: number): string {
    return new Intl.NumberFormat('es-CO', { maximumFractionDigits: 0 }).format(value);
  }

  formatLimiteUsuarios(p: PlanPublico): string {
    if (p.permiteUsuariosIlimitados || p.limiteUsuarios == null) return 'Usuarios ilimitados';
    return `Hasta ${p.limiteUsuarios} usuarios`;
  }

  formatLimiteStorage(p: PlanPublico): string {
    if (p.permiteStorageIlimitado || p.limiteStorageMb == null) return 'Almacenamiento ilimitado';
    return `${p.limiteStorageMb} MB de almacenamiento`;
  }

  formatLimiteCartas(p: PlanPublico): string {
    if (p.permiteCartasIlimitadas || p.limiteCartasMes == null) return 'Cartas ilimitadas al mes';
    return `${p.limiteCartasMes} cartas al mes`;
  }

  ngOnInit(): void {
    this.title.setTitle('JAC App – Sistema digital para Juntas de Acción Comunal en Colombia');
    this.meta.updateTag({
      name: 'description',
      content: 'Software para gestionar pagos, cartas, requisitos y auditoría en Juntas de Acción Comunal. Contabilidad, actas y votaciones digitales para JAC en Colombia.',
    });
    this.meta.updateTag({ property: 'og:title', content: 'JAC App – Sistema para Juntas de Acción Comunal' });
    this.meta.updateTag({
      property: 'og:description',
      content: 'Software para gestionar pagos, cartas, requisitos y auditoría en Juntas de Acción Comunal en Colombia.',
    });
    if (this.auth.isAuthenticated()) {
      const user = this.auth.currentUser();
      if (user?.requiereCambioPassword) {
        this.router.navigate(['/cambiar-password']);
      } else if (this.auth.isPlatformAdmin()) {
        this.router.navigate(['/app/platform']);
      } else {
        this.router.navigate(['/app']);
      }
    }

    this.planesService.listar().subscribe({
      next: (p) => {
        this.planes.set(
          p.length > 0
            ? p
            : [
                {
                  id: 'fallback-basico',
                  nombre: 'Básico',
                  precioMensual: 0,
                  precioAnual: 0,
                  limiteUsuarios: 50,
                  limiteStorageMb: 100,
                  limiteCartasMes: 20,
                  diasPrueba: 30,
                },
                {
                  id: 'fallback-premium',
                  nombre: 'Premium',
                  precioMensual: 50000,
                  precioAnual: 500000,
                  limiteUsuarios: 200,
                  limiteStorageMb: 500,
                  limiteCartasMes: 100,
                  diasPrueba: 14,
                },
              ],
        );
        this.planesLoading.set(false);
      },
      error: () => {
        this.planes.set([
          {
            id: 'fallback-basico',
            nombre: 'Básico',
            precioMensual: 0,
            precioAnual: 0,
            limiteUsuarios: 50,
            limiteStorageMb: 100,
            limiteCartasMes: 20,
            diasPrueba: 30,
          },
          {
            id: 'fallback-premium',
            nombre: 'Premium',
            precioMensual: 50000,
            precioAnual: 500000,
            limiteUsuarios: 200,
            limiteStorageMb: 500,
            limiteCartasMes: 100,
            diasPrueba: 14,
          },
        ]);
        this.planesLoading.set(false);
      },
    });
  }
}
