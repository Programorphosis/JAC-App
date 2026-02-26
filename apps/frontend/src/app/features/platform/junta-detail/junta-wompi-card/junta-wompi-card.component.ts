import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
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
    MatIconModule,
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

  mostrarFormulario = false;

  form = {
    wompiPrivateKey: '',
    wompiPublicKey: '',
    wompiIntegritySecret: '',
    wompiEventsSecret: '',
    wompiEnvironment: 'sandbox',
  };

  abrirFormulario(): void {
    this.form = {
      wompiPrivateKey: '',
      wompiPublicKey: '',
      wompiIntegritySecret: '',
      wompiEventsSecret: '',
      wompiEnvironment: 'sandbox',
    };
    this.mostrarFormulario = true;
  }

  cancelar(): void {
    this.mostrarFormulario = false;
  }

  enviar(): void {
    const v = (s: string) => (s?.trim() || null);
    this.guardar.emit({
      wompiPrivateKey: v(this.form.wompiPrivateKey),
      wompiPublicKey: v(this.form.wompiPublicKey),
      wompiIntegritySecret: v(this.form.wompiIntegritySecret),
      wompiEventsSecret: v(this.form.wompiEventsSecret),
      wompiEnvironment: v(this.form.wompiEnvironment) || 'sandbox',
    });
    this.mostrarFormulario = false;
  }
}
