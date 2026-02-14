import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocumentosService, DocumentoItem } from '../../cartas/services/documentos.service';

const TIPOS = [
  { value: 'RECIBO_AGUA', label: 'Recibo agua' },
  { value: 'SOPORTE_CARTA', label: 'Soporte carta' },
];

@Component({
  selector: 'app-usuario-documentos',
  standalone: true,
  imports: [FormsModule, MatCardModule, MatButtonModule],
  templateUrl: './usuario-documentos.component.html',
  styleUrl: './usuario-documentos.component.scss',
})
export class UsuarioDocumentosComponent implements OnInit {
  @Input() usuarioId!: string;
  documentos: DocumentoItem[] = [];
  loading = false;
  subiendo = false;
  tipoSeleccionado = 'RECIBO_AGUA';

  readonly tipos = TIPOS;

  constructor(
    private readonly documentosSvc: DocumentosService,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    if (this.usuarioId) {
      this.cargar();
    }
  }

  cargar(): void {
    this.loading = true;
    this.documentosSvc.listarPorUsuario(this.usuarioId).subscribe({
      next: (d) => {
        this.documentos = d;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;
    this.subiendo = true;
    this.documentosSvc.subir(this.usuarioId, this.tipoSeleccionado, file).subscribe({
      next: () => {
        this.subiendo = false;
        this.snackBar.open('Documento subido', 'Cerrar', { duration: 2000 });
        this.cargar();
        input.value = '';
      },
      error: (err) => {
        this.subiendo = false;
        this.snackBar.open(err.error?.error?.message || err.error?.message || 'Error', 'Cerrar', {
          duration: 5000,
        });
      },
    });
  }

  descargar(d: DocumentoItem): void {
    this.documentosSvc.getUrlDescarga(d.id).subscribe({
      next: (r) => window.open(r.url, '_blank'),
      error: () => this.snackBar.open('Error al obtener enlace', 'Cerrar', { duration: 3000 }),
    });
  }

  formatearFecha(f: string): string {
    return new Date(f).toLocaleDateString('es-CO');
  }
}
