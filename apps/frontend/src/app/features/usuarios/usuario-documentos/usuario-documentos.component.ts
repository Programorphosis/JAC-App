import { Component, Input, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatInputModule } from '@angular/material/input';
import { MatIconModule } from '@angular/material/icon';
import { MatSnackBar } from '@angular/material/snack-bar';
import { DocumentosService, DocumentoItem } from '../../cartas/services/documentos.service';
import { getApiErrorMessage } from '../../../shared/utils/api-error.util';
import { FormatearFechaPipe } from '../../../shared/pipes/formatear-fecha.pipe';
import { AuthService } from '../../../core/auth/auth.service';

const TIPOS = [
  { value: 'RECIBO_AGUA', label: 'Recibo agua' },
  { value: 'SOPORTE_CARTA', label: 'Soporte carta' },
];

@Component({
  selector: 'app-usuario-documentos',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatSelectModule,
    MatInputModule,
    MatIconModule,
    FormatearFechaPipe,
  ],
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
    private readonly snackBar: MatSnackBar,
    readonly auth: AuthService
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
        this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 });
      },
    });
  }

  descargar(d: DocumentoItem): void {
    this.documentosSvc.getUrlDescarga(d.id).subscribe({
      next: (r) => window.open(r.url, '_blank'),
      error: (err) => this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 }),
    });
  }


}
