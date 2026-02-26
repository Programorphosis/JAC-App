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
import { getApiErrorMessage, getApiErrorCode } from '../../../shared/utils/api-error.util';
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
        this.snackBar.open(this.getMensajeErrorDocumento(err), 'Cerrar', { duration: 6000 });
      },
    });
  }

  getMensajeErrorDocumento(err: unknown): string {
    const code = getApiErrorCode(err);
    const mensajes: Record<string, string> = {
      LIMITE_STORAGE_EXCEDIDO: 'Se ha superado el límite de almacenamiento del plan. Contacte al administrador para ampliarlo.',
      ARCHIVO_SOBREPASA_TAMANIO: 'El archivo excede el tamaño máximo permitido (5 MB).',
      FORMATO_ARCHIVO_NO_PERMITIDO: 'Formato de archivo no permitido. Use PDF, JPG o PNG.',
      TIPO_DOCUMENTO_NO_PERMITIDO: 'Tipo de documento no permitido para este usuario.',
      ALMACENAMIENTO_NO_CONFIGURADO: 'El almacenamiento no está configurado. Contacte al administrador.',
      SUSCRIPCION_VENCIDA: 'La suscripción de la junta ha vencido. No se pueden subir documentos.',
    };
    return (code && mensajes[code]) ? mensajes[code] : getApiErrorMessage(err);
  }

  descargar(d: DocumentoItem): void {
    this.documentosSvc.getUrlDescarga(d.id).subscribe({
      next: (r) => window.open(r.url, '_blank'),
      error: (err) => this.snackBar.open(getApiErrorMessage(err), 'Cerrar', { duration: 5000 }),
    });
  }


}
