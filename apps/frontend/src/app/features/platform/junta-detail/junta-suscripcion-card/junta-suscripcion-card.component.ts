import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { DecimalPipe } from '@angular/common';
import { FormatearFechaPipe } from '../../../../shared/pipes/formatear-fecha.pipe';
import type { JuntaDetalle } from '../../services/platform-juntas.service';

@Component({
  selector: 'app-junta-suscripcion-card',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, DecimalPipe, FormatearFechaPipe],
  templateUrl: './junta-suscripcion-card.component.html',
  styleUrl: './junta-suscripcion-card.component.scss',
})
export class JuntaSuscripcionCardComponent {
  @Input({ required: true }) junta!: JuntaDetalle;

  @Output() crearSuscripcion = new EventEmitter<void>();
  @Output() cambiarPlan = new EventEmitter<void>();
}
