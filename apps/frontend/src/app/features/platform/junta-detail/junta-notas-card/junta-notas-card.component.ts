import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { FormsModule } from '@angular/forms';
import { FormatearFechaHoraPipe } from '../../../../shared/pipes/formatear-fecha-hora.pipe';
import type { JuntaDetalle } from '../../services/platform-juntas.service';
import type { NotaJuntaItem } from '../../services/platform-juntas.service';

@Component({
  selector: 'app-junta-notas-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    FormsModule,
    FormatearFechaHoraPipe,
  ],
  templateUrl: './junta-notas-card.component.html',
  styleUrl: './junta-notas-card.component.scss',
})
export class JuntaNotasCardComponent {
  @Input({ required: true }) junta!: JuntaDetalle;
  @Input() notas: NotaJuntaItem[] = [];
  @Input() notasMeta: { page: number; limit: number; total: number; totalPages: number } | null = null;
  @Input() loadingNotas = false;
  @Input() nuevaNotaTexto = '';
  @Input() guardandoNota = false;

  @Output() nuevaNotaTextoChange = new EventEmitter<string>();
  @Output() agregarNota = new EventEmitter<void>();
  @Output() exportar = new EventEmitter<'json' | 'csv'>();
  @Output() cargarNotas = new EventEmitter<number>();

  onNuevaNotaChange(value: string): void {
    this.nuevaNotaTextoChange.emit(value);
  }
}
