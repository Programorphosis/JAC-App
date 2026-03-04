import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { FormsModule } from '@angular/forms';
import { PlatformJuntasService, JuntaListItem } from '../services/platform-juntas.service';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';
import { NombreCompletoJuntaPipe } from '../../../shared/pipes/nombre-completo-junta.pipe';

type ActivoFilter = 'todos' | true | false;

@Component({
  selector: 'app-juntas-list',
  standalone: true,
  imports: [
    MatTableModule,
    MatButtonModule,
    MatIconModule,
    MatPaginatorModule,
    MatSelectModule,
    MatFormFieldModule,
    FormsModule,
    DecimalPipe,
    FormatearFechaPipe,
    NombreCompletoJuntaPipe,
  ],
  templateUrl: './juntas-list.component.html',
  styleUrl: './juntas-list.component.scss',
})
export class JuntasListComponent implements OnInit {
  displayedColumns = ['nombre', 'nit', 'montoCarta', 'estado', 'fechaCreacion', 'acciones'];
  dataSource = new MatTableDataSource<JuntaListItem>([]);
  loading = false;
  total = 0;
  page = 1;
  limit = 10;
  activoFilter: ActivoFilter = 'todos';

  constructor(
    private readonly platform: PlatformJuntasService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    const activo =
      this.activoFilter === 'todos' ? undefined : this.activoFilter;
    this.platform.listar(this.page, this.limit, activo).subscribe({
      next: (res) => {
        this.dataSource.data = res.data;
        this.total = res.meta.total;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  cambiarActivo(v: ActivoFilter): void {
    this.activoFilter = v;
    this.page = 1;
    this.cargar();
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex + 1;
    this.limit = e.pageSize;
    this.cargar();
  }

  ver(id: string): void {
    this.router.navigate(['/app/platform', 'juntas', id]);
  }

  crear(): void {
    this.router.navigate(['/app/platform', 'juntas', 'nueva']);
  }
}
