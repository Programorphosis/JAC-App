import { Component, OnInit } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog } from '@angular/material/dialog';
import { RequisitosService, RequisitoTipoItem, CreateRequisitoTipoBody, UpdateRequisitoTipoBody } from '../services/requisitos.service';
import { RequisitoFormComponent } from '../requisito-form/requisito-form.component';
import { ConfirmarEliminarRequisitoDialogComponent } from '../confirmar-eliminar-requisito-dialog/confirmar-eliminar-requisito-dialog.component';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';
import { formatearNombre } from '../../../shared/utils/formatear-nombre.util';

@Component({
  selector: 'app-requisitos-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatCardModule, MatTooltipModule, RequisitoFormComponent],
  templateUrl: './requisitos-list.component.html',
  styleUrl: './requisitos-list.component.scss',
})
export class RequisitosListComponent implements OnInit {
  displayedColumns = ['nombre', 'corteAutomatico', 'modificador', 'acciones'];
  dataSource = new MatTableDataSource<RequisitoTipoItem>([]);
  loading = false;
  mostrandoForm = false;
  editandoRequisito: RequisitoTipoItem | null = null;

  constructor(
    private readonly requisitos: RequisitosService,
    private readonly snackBar: MatSnackBar,
    private readonly dialog: MatDialog,
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.requisitos.listar().subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  crear(): void {
    this.editandoRequisito = null;
    this.mostrandoForm = true;
  }

  editar(r: RequisitoTipoItem): void {
    this.editandoRequisito = r;
    this.mostrandoForm = true;
  }

  onGuardar(body: CreateRequisitoTipoBody): void {
    const updateBody: UpdateRequisitoTipoBody = {
      nombre: body.nombre,
      modificadorId: body.modificadorId as string | null | undefined,
      tieneCorteAutomatico: body.tieneCorteAutomatico,
    };
    if (this.editandoRequisito) {
      this.requisitos.actualizar(this.editandoRequisito.id, updateBody).subscribe({
        next: () => {
          this.mostrandoForm = false;
          this.editandoRequisito = null;
          this.cargar();
          this.snackBar.open('Requisito actualizado', 'Cerrar', { duration: 2000 });
        },
        error: (err) => {
          this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
        },
      });
    } else {
      this.requisitos.crear(body).subscribe({
        next: () => {
          this.mostrandoForm = false;
          this.cargar();
          this.snackBar.open('Requisito creado', 'Cerrar', { duration: 2000 });
        },
        error: (err) => {
          this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
        },
      });
    }
  }

  cancelarForm(): void {
    this.mostrandoForm = false;
    this.editandoRequisito = null;
  }

  eliminar(r: RequisitoTipoItem): void {
    const ref = this.dialog.open(ConfirmarEliminarRequisitoDialogComponent, {
      data: { nombre: r.nombre },
      width: '360px',
    });
    ref.afterClosed().subscribe((confirmado) => {
      if (confirmado) {
        this.requisitos.eliminar(r.id).subscribe({
          next: () => {
            this.cargar();
            this.snackBar.open('Requisito eliminado', 'Cerrar', { duration: 2000 });
          },
          error: (err) => {
            this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
          },
        });
      }
    });
  }

  modificador(r: RequisitoTipoItem): string {
    if (r.modificador) {
      return `${formatearNombre(r.modificador.nombres)} ${formatearNombre(r.modificador.apellidos)}`;
    }
    return '-';
  }
}
