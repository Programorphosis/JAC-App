import { Component, Input } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { DecimalPipe, NgClass } from '@angular/common';
import { progreso, colorProgreso } from '../../../../shared/utils/progreso.util';
import type { JuntaDetalle } from '../../services/platform-juntas.service';
import type { JuntaUso } from '../../services/platform-juntas.service';

@Component({
  selector: 'app-junta-uso-card',
  standalone: true,
  imports: [MatCardModule, NgClass, DecimalPipe],
  templateUrl: './junta-uso-card.component.html',
  styleUrl: './junta-uso-card.component.scss',
})
export class JuntaUsoCardComponent {
  @Input({ required: true }) junta!: JuntaDetalle;
  @Input() uso: JuntaUso | null = null;
  @Input() loading = false;

  readonly progreso = progreso;
  readonly colorProgreso = colorProgreso;

  /** Storage actual en MB (PA5-1). Fallback a documentosCount si API antigua. */
  storageActual(): number {
    if (!this.uso) return 0;
    return this.uso.storageMb ?? this.uso.documentosCount;
  }

  /** Usa límites efectivos (API) o fallback a plan. null = ilimitado. */
  limiteUsuarios(): number | null {
    const le = this.uso?.limitesEfectivos?.limiteUsuarios;
    if (le != null) return le;
    return this.junta.suscripcion?.plan.limiteUsuarios ?? null;
  }

  limiteStorage(): number | null {
    const le = this.uso?.limitesEfectivos?.limiteStorageMb;
    if (le != null) return le;
    return this.junta.suscripcion?.plan.limiteStorageMb ?? null;
  }

  limiteCartas(): number | null {
    const le = this.uso?.limitesEfectivos?.limiteCartasMes;
    if (le != null) return le;
    return this.junta.suscripcion?.plan.limiteCartasMes ?? null;
  }

  /** Hay suscripción con límite (puede ser ilimitado). */
  tieneLimiteUsuarios(): boolean {
    return !!this.junta.suscripcion?.plan;
  }

  tieneLimiteStorage(): boolean {
    return !!this.junta.suscripcion?.plan;
  }

  tieneLimiteCartas(): boolean {
    return !!this.junta.suscripcion?.plan;
  }
}
