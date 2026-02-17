import { Component, OnInit } from '@angular/core';
import { Clipboard } from '@angular/cdk/clipboard';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { MiJuntaService, MiJuntaResponse } from '../../mi-junta/services/mi-junta.service';
import { AuthService } from '../../../core/auth/auth.service';
import { AppCanDirective } from '../../../core/auth/app-can.directive';

@Component({
  selector: 'app-configuracion',
  standalone: true,
  imports: [
    MatCardModule,
    MatIconModule,
    MatButtonModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatProgressSpinnerModule,
    MatSnackBarModule,
    FormsModule,
    AppCanDirective,
  ],
  templateUrl: './configuracion.component.html',
  styleUrl: './configuracion.component.scss',
})
export class ConfiguracionComponent implements OnInit {
  junta: MiJuntaResponse | null = null;
  loading = true;
  guardando = false;

  form = {
    wompiPrivateKey: '',
    wompiPublicKey: '',
    wompiIntegritySecret: '',
    wompiEventsSecret: '',
    wompiEnvironment: 'sandbox',
  };

  constructor(
    readonly auth: AuthService,
    private readonly miJunta: MiJuntaService,
    private readonly snackBar: MatSnackBar,
    private readonly clipboard: Clipboard,
  ) {}

  copiarWebhook(): void {
    if (this.junta?.webhookUrl) {
      this.clipboard.copy(this.junta.webhookUrl);
      this.snackBar.open('URL copiada al portapapeles', undefined, { duration: 2000 });
    }
  }

  ngOnInit(): void {
    this.miJunta.obtener().subscribe({
      next: (j) => {
        this.junta = j;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  enviar(): void {
    const v = (s: string) => (s?.trim() || null);
    this.guardando = true;
    this.miJunta
      .actualizarWompi({
        wompiPrivateKey: v(this.form.wompiPrivateKey),
        wompiPublicKey: v(this.form.wompiPublicKey),
        wompiIntegritySecret: v(this.form.wompiIntegritySecret),
        wompiEventsSecret: v(this.form.wompiEventsSecret),
        wompiEnvironment: v(this.form.wompiEnvironment) || 'sandbox',
      })
      .subscribe({
        next: () => {
          this.guardando = false;
          this.junta = { ...this.junta!, wompiConfigurado: !!v(this.form.wompiPrivateKey) };
          this.snackBar.open('Configuración Wompi guardada', undefined, { duration: 3000 });
          this.form = {
            wompiPrivateKey: '',
            wompiPublicKey: '',
            wompiIntegritySecret: '',
            wompiEventsSecret: '',
            wompiEnvironment: 'sandbox',
          };
        },
        error: () => {
          this.guardando = false;
          this.snackBar.open('Error al guardar', undefined, { duration: 3000 });
        },
      });
  }
}
