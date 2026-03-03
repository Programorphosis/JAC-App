import { Component } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-recuperar-contrasena',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './recuperar-contrasena.component.html',
  styleUrl: './recuperar-contrasena.component.scss',
})
export class RecuperarContrasenaComponent {
  step: 1 | 2 = 1;
  emailEnviado = '';
  formPaso1: FormGroup;
  formPaso2: FormGroup;
  loading = false;
  error = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {
    this.formPaso1 = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
    });
    this.formPaso2 = this.fb.group({
      codigo: ['', [Validators.required, Validators.minLength(6), Validators.maxLength(6)]],
      passwordNueva: ['', [Validators.required, Validators.minLength(6)]],
      passwordNuevaConfirmar: ['', [Validators.required]],
    });
  }

  onSubmitPaso1(): void {
    if (this.formPaso1.invalid) return;
    this.loading = true;
    this.error = '';
    const email = this.formPaso1.get('email')?.value?.trim().toLowerCase();

    this.auth.solicitarCodigoRecuperacion(email).subscribe({
      next: () => {
        this.emailEnviado = email;
        this.step = 2;
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error?.message || err.error?.message || 'Error al enviar el código';
      },
    });
  }

  onSubmitPaso2(): void {
    if (this.formPaso2.invalid) return;
    const pn = this.formPaso2.get('passwordNueva')?.value;
    const pnc = this.formPaso2.get('passwordNuevaConfirmar')?.value;
    if (pn !== pnc) {
      this.formPaso2.get('passwordNuevaConfirmar')?.setErrors({ mismatch: true });
      return;
    }

    this.loading = true;
    this.error = '';

    this.auth
      .verificarCodigoRecuperacion({
        email: this.emailEnviado,
        codigo: this.formPaso2.get('codigo')?.value?.trim(),
        passwordNueva: pn,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          this.router.navigate(['/login'], {
            queryParams: { mensaje: 'Contraseña actualizada. Inicia sesión con tu nueva contraseña.' },
          });
        },
        error: (err) => {
          this.loading = false;
          this.error =
            err.error?.error?.message || err.error?.message || 'Código inválido o expirado';
        },
      });
  }

  volverPaso1(): void {
    this.step = 1;
    this.error = '';
  }
}
