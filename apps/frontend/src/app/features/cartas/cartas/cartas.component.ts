import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { CartasService, CartaPendienteItem } from '../services/cartas.service';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';

@Component({
  selector: 'app-cartas',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatTableModule, FormatearFechaPipe],
  templateUrl: './cartas.component.html',
  styleUrl: './cartas.component.scss',
})
export class CartasComponent implements OnInit {
  displayedColumns = ['usuario', 'documento', 'fechaSolicitud', 'acciones'];
  dataSource = new MatTableDataSource<CartaPendienteItem>([]);
  loading = false;

  constructor(
    private readonly cartas: CartasService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.cartas.listarPendientes().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  validar(c: CartaPendienteItem): void {
    this.cartas.validar(c.id).subscribe({
      next: (r) => {
        this.snackBar.open(`Carta aprobada. Consecutivo: ${r.consecutivo}/${r.anio}`, 'Cerrar', { duration: 4000 });
        this.cargar();
      },
      error: (err) => {
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
  }

  nombreUsuario(c: CartaPendienteItem): string {
    return `${c.usuarioNombres} ${c.usuarioApellidos}`;
  }
}
