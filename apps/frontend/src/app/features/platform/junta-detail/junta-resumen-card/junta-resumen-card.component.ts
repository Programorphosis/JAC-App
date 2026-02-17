import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { DecimalPipe } from '@angular/common';
import { FormatearFechaHoraPipe } from '../../../../shared/pipes/formatear-fecha-hora.pipe';
import type { JuntaResumen } from '../../services/platform-juntas.service';

@Component({
  selector: 'app-junta-resumen-card',
  standalone: true,
  imports: [MatCardModule, DecimalPipe, FormatearFechaHoraPipe],
  templateUrl: './junta-resumen-card.component.html',
  styleUrl: './junta-resumen-card.component.scss',
})
export class JuntaResumenCardComponent {
  @Input() resumen: JuntaResumen | null = null;
  @Input() loading = false;
}
