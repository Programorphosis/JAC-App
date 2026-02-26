import { Component, OnInit } from '@angular/core';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatCardModule } from '@angular/material/card';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatButtonToggleModule, MatButtonToggleChange } from '@angular/material/button-toggle';
import {
  PlatformAuditoriaService,
  AuditoriaPlataformaItem,
  TipoAuditoriaPlataforma,
} from '../services/platform-auditoria.service';
import { FormatearNombrePipe } from '../../../shared/pipes/formatear-nombre.pipe';
import { FormatearFechaHoraPipe } from '../../../shared/pipes/formatear-fecha-hora.pipe';
import { NombreCompletoJuntaPipe } from '../../../shared/pipes/nombre-completo-junta.pipe';

@Component({
  selector: 'app-auditoria-plataforma',
  standalone: true,
  imports: [
    MatTableModule,
    MatCardModule,
    MatPaginatorModule,
    MatButtonToggleModule,
    FormatearNombrePipe,
    FormatearFechaHoraPipe,
    NombreCompletoJuntaPipe,
  ],
  templateUrl: './auditoria-plataforma.component.html',
  styleUrl: './auditoria-plataforma.component.scss',
})
export class AuditoriaPlataformaComponent implements OnInit {
  displayedColumns = ['fecha', 'accion', 'junta', 'ejecutadoPor', 'metadata'];
  dataSource = new MatTableDataSource<AuditoriaPlataformaItem>([]);
  loading = false;
  total = 0;
  page = 1;
  limit = 25;
  tipo: TipoAuditoriaPlataforma = 'all';

  constructor(private readonly auditoria: PlatformAuditoriaService) {}

  ngOnInit(): void {
    this.cargar();
  }

  onTipoChange(event: MatButtonToggleChange): void {
    this.tipo = event.value as TipoAuditoriaPlataforma;
    this.page = 1;
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.auditoria.listar(this.page, this.limit, this.tipo).subscribe({
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

  resumirMetadata(m: Record<string, unknown>): string {
    if (!m || Object.keys(m).length === 0) return '-';
    const parts = Object.entries(m)
      .slice(0, 2)
      .map(([k, v]) => `${k}: ${String(v)}`);
    return parts.join(' · ');
  }
}
