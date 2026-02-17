import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { NgClass } from '@angular/common';
import { DecimalPipe } from '@angular/common';
import { FormatearFechaPipe } from '../../../../shared/pipes/formatear-fecha.pipe';
import { barWidth, colorProgreso } from '../../../../shared/utils/progreso.util';
import type { JuntaDetalle } from '../../services/platform-juntas.service';
import type { AlertaLimite } from '../../services/platform-juntas.service';

@Component({
  selector: 'app-junta-info-card',
  standalone: true,
  imports: [MatCardModule, MatButtonModule, NgClass, DecimalPipe, FormatearFechaPipe],
  templateUrl: './junta-info-card.component.html',
  styleUrl: './junta-info-card.component.scss',
})
export class JuntaInfoCardComponent {
  @Input({ required: true }) junta!: JuntaDetalle;
  @Input() alertas: AlertaLimite[] = [];

  @Output() editar = new EventEmitter<void>();
  @Output() toggleActivo = new EventEmitter<void>();
  @Output() darBaja = new EventEmitter<void>();

  readonly colorProgreso = colorProgreso;
  readonly barWidth = barWidth;
}
