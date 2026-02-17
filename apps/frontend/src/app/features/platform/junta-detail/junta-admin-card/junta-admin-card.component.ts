import { Component, Input, Output, EventEmitter } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import type { JuntaDetalle } from '../../services/platform-juntas.service';

@Component({
  selector: 'app-junta-admin-card',
  standalone: true,
  imports: [MatCardModule, MatButtonModule],
  templateUrl: './junta-admin-card.component.html',
  styleUrl: './junta-admin-card.component.scss',
})
export class JuntaAdminCardComponent {
  @Input({ required: true }) junta!: JuntaDetalle;

  @Output() resetPassword = new EventEmitter<void>();
  @Output() reenviarCredenciales = new EventEmitter<void>();
  @Output() cambiarAdmin = new EventEmitter<void>();
  @Output() bloquearAdmin = new EventEmitter<void>();
}
