import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { CartasService, CartaPendienteItem } from '../services/cartas.service';
import { AuthService } from '../../../core/auth/auth.service';
import {
  CartaRechazarDialogComponent,
  CartaRechazarDialogData,
  CartaRechazarDialogResult,
} from '../carta-rechazar-dialog/carta-rechazar-dialog.component';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';
import { AppCanDirective } from '../../../core/auth/app-can.directive';

@Component({
  selector: 'app-cartas',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatTableModule, FormatearFechaPipe, AppCanDirective],
  templateUrl: './cartas.component.html',
  styleUrl: './cartas.component.scss',
})
export class CartasComponent implements OnInit {
  displayedColumns: string[] = ['usuario', 'documento', 'fechaSolicitud'];
  dataSource = new MatTableDataSource<CartaPendienteItem>([]);
  loading = false;

  constructor(
    private readonly cartas: CartasService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
    readonly auth: AuthService,
  ) {}

  ngOnInit(): void {
    if (this.auth.can(this.auth.permissions.CARTAS_VALIDAR)) {
      this.displayedColumns = ['usuario', 'documento', 'fechaSolicitud', 'acciones'];
    }
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

  rechazar(c: CartaPendienteItem): void {
    const data: CartaRechazarDialogData = {
      usuarioNombre: this.nombreUsuario(c),
    };
    this.dialog
      .open<CartaRechazarDialogComponent, CartaRechazarDialogData, CartaRechazarDialogResult | null>(
        CartaRechazarDialogComponent,
        { data, width: '400px' }
      )
      .afterClosed()
      .subscribe((result) => {
        if (!result) return;
        this.cartas.rechazar(c.id, result.motivoRechazo).subscribe({
          next: () => {
            this.snackBar.open('Carta rechazada', 'Cerrar', { duration: 3000 });
            this.cargar();
          },
          error: (err) => {
            this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
          },
        });
      });
  }

  nombreUsuario(c: CartaPendienteItem): string {
    return `${c.usuarioNombres} ${c.usuarioApellidos}`;
  }
}
