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
  template: `
    <div class="aviso-modal">
      <div class="aviso-modal-glow"></div>
      <div class="aviso-modal-content">
        <div class="aviso-modal-header">
          <div class="aviso-modal-icon">
            <mat-icon fontIcon="campaign" class="!text-4xl !w-12 !h-12"></mat-icon>
          </div>
          <h2 class="aviso-modal-title">{{ data.titulo }}</h2>
          @if (data.total > 1) {
            <span class="aviso-modal-badge">{{ data.indice }} de {{ data.total }}</span>
          }
        </div>
        <div class="aviso-modal-body">
          <p class="aviso-modal-text">{{ data.contenido }}</p>
          <p class="aviso-modal-fecha">{{ data.fechaPublicacion | date:'medium' }}</p>
        </div>
        <div class="aviso-modal-actions">
          <button mat-raised-button color="primary" (click)="cerrar()" class="aviso-modal-btn">
            <mat-icon fontIcon="check" class="!text-lg !w-5 !h-5 mr-1"></mat-icon>
            Entendido
          </button>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .aviso-modal {
      position: relative;
      min-width: 320px;
      max-width: 480px;
      border-radius: 16px;
      overflow: hidden;
    }

    .aviso-modal-glow {
      position: absolute;
      inset: -2px;
      background: linear-gradient(135deg, #0d47a1 0%, #1565c0 25%, #1976d2 50%, #42a5f5 100%);
      border-radius: 18px;
      z-index: 0;
      opacity: 0.15;
    }

    .aviso-modal-content {
      position: relative;
      z-index: 1;
      background: linear-gradient(180deg, #ffffff 0%, #f8fafc 100%);
      border-radius: 16px;
      border: 1px solid rgba(13, 71, 161, 0.2);
      box-shadow: 0 8px 32px rgba(13, 71, 161, 0.12), 0 2px 8px rgba(0, 0, 0, 0.08);
    }

    .aviso-modal-header {
      padding: 1.5rem 1.5rem 0.75rem;
      text-align: center;
      position: relative;
    }

    .aviso-modal-icon {
      width: 64px;
      height: 64px;
      margin: 0 auto 1rem;
      border-radius: 50%;
      background: linear-gradient(135deg, #0d47a1 0%, #1976d2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 12px rgba(13, 71, 161, 0.35);
    }

    .aviso-modal-title {
      font-size: 1.25rem;
      font-weight: 700;
      color: #0d47a1;
      margin: 0;
      line-height: 1.3;
    }

    .aviso-modal-badge {
      display: inline-block;
      margin-top: 0.5rem;
      padding: 0.25rem 0.75rem;
      font-size: 0.75rem;
      font-weight: 600;
      color: #1565c0;
      background: rgba(21, 101, 192, 0.12);
      border-radius: 9999px;
    }

    .aviso-modal-body {
      padding: 0 1.5rem 1.25rem;
    }

    .aviso-modal-text {
      font-size: 0.9375rem;
      line-height: 1.6;
      color: #374151;
      margin: 0 0 0.75rem;
      white-space: pre-wrap;
    }

    .aviso-modal-fecha {
      font-size: 0.75rem;
      color: #6b7280;
      margin: 0;
    }

    .aviso-modal-actions {
      padding: 0 1.5rem 1.5rem;
      display: flex;
      justify-content: center;
    }

    .aviso-modal-btn {
      min-width: 140px;
    }
  `],
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
