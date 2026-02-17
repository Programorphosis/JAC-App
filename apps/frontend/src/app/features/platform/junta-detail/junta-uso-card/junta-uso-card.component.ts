import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { NgClass } from '@angular/common';
import { progreso, colorProgreso } from '../../../../shared/utils/progreso.util';
import type { JuntaDetalle } from '../../services/platform-juntas.service';
import type { JuntaUso } from '../../services/platform-juntas.service';

@Component({
  selector: 'app-junta-uso-card',
  standalone: true,
  imports: [MatCardModule, NgClass],
  templateUrl: './junta-uso-card.component.html',
  styleUrl: './junta-uso-card.component.scss',
})
export class JuntaUsoCardComponent {
  @Input({ required: true }) junta!: JuntaDetalle;
  @Input() uso: JuntaUso | null = null;
  @Input() loading = false;

  readonly progreso = progreso;
  readonly colorProgreso = colorProgreso;
}
