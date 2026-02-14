import { Component, Input, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { UsuariosService, DeudaResult } from '../services/usuarios.service';

@Component({
  selector: 'app-usuario-deuda',
  standalone: true,
  imports: [MatCardModule],
  templateUrl: './usuario-deuda.component.html',
  styleUrl: './usuario-deuda.component.scss',
})
export class UsuarioDeudaComponent implements OnInit {
  @Input() usuarioId!: string;
  deuda: DeudaResult | null = null;
  loading = false;

  constructor(private readonly usuarios: UsuariosService) {}

  ngOnInit(): void {
    if (this.usuarioId) {
      this.cargar();
    }
  }

  cargar(): void {
    this.loading = true;
    this.usuarios.getDeuda(this.usuarioId, true).subscribe({
      next: (d: DeudaResult) => {
        this.deuda = d;
        this.loading = false;
      },
      error: () => (this.loading = false),
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
