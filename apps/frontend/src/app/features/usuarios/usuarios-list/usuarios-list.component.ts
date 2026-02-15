import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { UsuariosService, UsuarioListItem } from '../services/usuarios.service';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-usuarios-list',
  standalone: true,
  imports: [MatTableModule, MatButtonModule, MatIconModule, MatPaginatorModule],
  templateUrl: './usuarios-list.component.html',
  styleUrl: './usuarios-list.component.scss',
})
export class UsuariosListComponent implements OnInit {
  displayedColumns = ['documento', 'nombres', 'roles', 'activo', 'acciones'];
  dataSource = new MatTableDataSource<UsuarioListItem>([]);
  loading = false;
  total = 0;
  page = 1;
  limit = 10;

  constructor(
    private readonly usuarios: UsuariosService,
    private readonly router: Router,
    private readonly auth: AuthService
  ) {}

  ngOnInit(): void {
    this.cargar();
  }

  cargar(): void {
    this.loading = true;
    this.usuarios.listar(this.page, this.limit).subscribe({
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
    this.router.navigate(['/usuarios', id]);
  }

  crear(): void {
    this.router.navigate(['/usuarios', 'nuevo']);
  }

  documento(u: UsuarioListItem): string {
    return `${u.tipoDocumento} ${u.numeroDocumento}`;
  }

  puedeCrearUsuario(): boolean {
    return this.auth.hasRole('ADMIN') || this.auth.hasRole('SECRETARIA');
  }

  roles(u: UsuarioListItem): string {
    return (u.roles || []).join(', ');
  }
}
