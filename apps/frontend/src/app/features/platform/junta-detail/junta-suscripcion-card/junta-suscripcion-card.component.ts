import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatIconModule } from '@angular/material/icon';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { DecimalPipe } from '@angular/common';
import { FormatearFechaPipe } from '../../../../shared/pipes/formatear-fecha.pipe';
import type { JuntaDetalle } from '../../services/platform-juntas.service';

@Component({
  selector: 'app-junta-suscripcion-card',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, MatIconModule, DecimalPipe, FormatearFechaPipe],
  templateUrl: './junta-suscripcion-card.component.html',
  styleUrl: './junta-suscripcion-card.component.scss',
})
export class JuntaSuscripcionCardComponent {
  @Input({ required: true }) junta!: JuntaDetalle;

  @Output() crearSuscripcion = new EventEmitter<void>();
  @Output() cambiarPlan = new EventEmitter<void>();

  tieneOverrides(): boolean {
    const s = this.junta.suscripcion;
    return !!(
      s &&
      (s.overrideLimiteUsuarios != null ||
        s.overrideLimiteStorageMb != null ||
        s.overrideLimiteCartasMes != null)
    );
  }
}
