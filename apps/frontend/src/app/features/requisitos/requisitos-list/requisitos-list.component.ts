import { Component, OnInit } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatSnackBar } from '@angular/material/snack-bar';
import { RequisitosService, RequisitoTipoItem, CreateRequisitoTipoBody } from '../services/requisitos.service';
import { RequisitoFormComponent } from '../requisito-form/requisito-form.component';

@Component({
  selector: 'app-requisitos-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatCardModule, RequisitoFormComponent],
  templateUrl: './requisitos-list.component.html',
  styleUrl: './requisitos-list.component.scss',
})
export class RequisitosListComponent implements OnInit {
  displayedColumns = ['nombre', 'corteAutomatico', 'modificador', 'acciones'];
  dataSource = new MatTableDataSource<RequisitoTipoItem>([]);
  loading = false;
  mostrandoForm = false;

  constructor(
    private readonly requisitos: RequisitosService,
    private readonly snackBar: MatSnackBar
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
    this.mostrandoForm = true;
  }

  onGuardar(body: CreateRequisitoTipoBody): void {
    this.requisitos.crear(body).subscribe({
      next: () => {
        this.mostrandoForm = false;
        this.cargar();
        this.snackBar.open('Requisito creado', 'Cerrar', { duration: 2000 });
      },
      error: (err) => {
        this.snackBar.open(err.error?.error?.message || err.error?.message || 'Error', 'Cerrar', { duration: 5000 });
      },
    });
  }

  cancelarForm(): void {
    this.mostrandoForm = false;
  }

  modificador(r: RequisitoTipoItem): string {
    if (r.modificador) {
      return `${r.modificador.nombres} ${r.modificador.apellidos}`;
    }
    return '-';
  }
}
