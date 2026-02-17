import { Component, Inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogModule,
  MatDialogRef,
} from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatSnackBar } from '@angular/material/snack-bar';

export interface MensajeDialogData {
  titulo: string;
  mensaje: string;
  /** Si se proporciona, se muestra un botón para copiar al portapapeles */
  textoCopiable?: string;
}

@Component({
  selector: 'app-mensaje-dialog',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, MatTooltipModule],
  template: `
    <h2 mat-dialog-title>{{ data.titulo }}</h2>
    <mat-dialog-content>
      <p class="text-gray-700">{{ data.mensaje }}</p>
      @if (data.textoCopiable) {
        <div class="mt-4 flex items-center gap-2 rounded-lg bg-gray-100 p-3">
          <code class="flex-1 break-all font-mono text-sm">{{ data.textoCopiable }}</code>
          <button
            mat-icon-button
            matTooltip="Copiar"
            (click)="copiar()"
          >
            <mat-icon fontIcon="content_copy"></mat-icon>
          </button>
        </div>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-raised-button color="primary" [mat-dialog-close]="true">
        Cerrar
      </button>
    </mat-dialog-actions>
  `,
})
export class MensajeDialogComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<MensajeDialogComponent, boolean>,
    @Inject(MAT_DIALOG_DATA) public readonly data: MensajeDialogData,
    private readonly clipboard: Clipboard,
    private readonly snackBar: MatSnackBar
  ) {}

  copiar(): void {
    if (this.data.textoCopiable) {
      this.clipboard.copy(this.data.textoCopiable);
      this.snackBar.open('Copiado al portapapeles', 'Cerrar', { duration: 2000 });
    }
  }
}
