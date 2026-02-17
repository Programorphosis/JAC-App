import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { FormsModule } from '@angular/forms';
import type { JuntaDetalle } from '../../services/platform-juntas.service';

export interface WompiConfigGuardar {
  wompiPrivateKey?: string | null;
  wompiPublicKey?: string | null;
  wompiIntegritySecret?: string | null;
  wompiEventsSecret?: string | null;
  wompiEnvironment?: string | null;
}

@Component({
  selector: 'app-junta-wompi-card',
  standalone: true,
  imports: [
    MatCardModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    FormsModule,
  ],
  templateUrl: './junta-wompi-card.component.html',
  styleUrl: './junta-wompi-card.component.scss',
})
export class JuntaWompiCardComponent {
  @Input({ required: true }) junta!: JuntaDetalle;
  @Input() guardando = false;

  @Output() guardar = new EventEmitter<WompiConfigGuardar>();

  form = {
    wompiPrivateKey: '',
    wompiPublicKey: '',
    wompiIntegritySecret: '',
    wompiEventsSecret: '',
    wompiEnvironment: 'sandbox',
  };

  enviar(): void {
    const v = (s: string) => (s?.trim() || null);
    this.guardar.emit({
      wompiPrivateKey: v(this.form.wompiPrivateKey),
      wompiPublicKey: v(this.form.wompiPublicKey),
      wompiIntegritySecret: v(this.form.wompiIntegritySecret),
      wompiEventsSecret: v(this.form.wompiEventsSecret),
      wompiEnvironment: v(this.form.wompiEnvironment) || 'sandbox',
    });
  }
}
