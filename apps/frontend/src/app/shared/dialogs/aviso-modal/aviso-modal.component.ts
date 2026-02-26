import { Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { DatePipe } from '@angular/common';

export interface AvisoModalData {
  titulo: string;
  contenido: string;
  fechaPublicacion: string;
  indice: number;
  total: number;
}

/**
 * Modal tipo "evento de juego" para mostrar avisos al abrir sesión.
 * Diseño atractivo con gradiente y botón de cerrar.
 */
@Component({
  selector: 'app-aviso-modal',
  standalone: true,
  imports: [MatDialogModule, MatButtonModule, MatIconModule, DatePipe],
  templateUrl: './aviso-modal.component.html',    
  styleUrl: './aviso-modal.component.scss',

 
})
export class AvisoModalComponent {
  constructor(
    private readonly dialogRef: MatDialogRef<AvisoModalComponent>,
    @Inject(MAT_DIALOG_DATA) public readonly data: AvisoModalData
  ) {}

  cerrar(): void {
    this.dialogRef.close();
  }
}
