import { Component, OnInit } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { PlatformService, JuntaListItem } from '../services/platform.service';

@Component({
  selector: 'app-juntas-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule, DecimalPipe],
  templateUrl: './juntas-list.component.html',
  styleUrl: './juntas-list.component.scss',
})
export class JuntasListComponent implements OnInit {
  displayedColumns = ['nombre', 'nit', 'montoCarta', 'fechaCreacion', 'acciones'];
  dataSource = new MatTableDataSource<JuntaListItem>([]);
  loading = false;
  total = 0;
  page = 1;
  limit = 10;

  constructor(
    private readonly platform: PlatformService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.platform.listar(this.page, this.limit).subscribe({
      next: (res) => {
        this.dataSource.data = res.data;
        this.total = res.meta.total;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onPage(e: PageEvent): void {
    this.page = e.pageIndex + 1;
    this.limit = e.pageSize;
    this.cargar();
  }

  ver(id: string): void {
    this.router.navigate(['/platform', 'juntas', id]);
  }

  crear(): void {
    this.router.navigate(['/platform', 'juntas', 'nueva']);
  }

  formatearFecha(f: string): string {
    return new Date(f).toLocaleDateString('es-CO');
  }
}
