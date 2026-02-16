import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { PagosService } from '../services/pagos.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-pagos-retorno',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatProgressSpinnerModule],
  templateUrl: './pagos-retorno.component.html',
  styleUrl: './pagos-retorno.component.scss',
})
export class PagosRetornoComponent implements OnInit {
  loading = true;
  resultado: { registrado: boolean; pagoId?: string; monto?: number; consecutivo?: number; status?: string } | null = null;

  constructor(
    private readonly route: ActivatedRoute,
    private readonly router: Router,
    private readonly pagos: PagosService,
    readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    const transactionId = this.route.snapshot.queryParamMap.get('transaction_id');
    if (!transactionId) {
      this.loading = false;
      this.resultado = { registrado: false };
      return;
    }
    this.pagos.verificarPagoOnline(transactionId).subscribe({
      next: (r) => {
        this.resultado = r;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
        this.resultado = { registrado: false };
      },
    });
  }

  volver(): void {
    const user = this.auth.currentUser();
    if (user && !this.auth.can(this.auth.permissions.PAGOS_GESTIONAR)) {
      this.router.navigate(['/usuarios', user.id]);
    } else {
      this.router.navigate(['/pagos']);
    }
  }

  formatearMoneda(v: number): string {
    return new Intl.NumberFormat('es-CO', { style: 'currency', currency: 'COP' }).format(v);
  }
}
