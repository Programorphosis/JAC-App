import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-cambiar-password',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
  ],
  templateUrl: './cambiar-password.component.html',
  styleUrl: './cambiar-password.component.scss',
})
export class CambiarPasswordComponent {
  form: FormGroup;
  loading = false;
  error = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {
    const requiereEmail = this.auth.currentUser()?.requiereCambioPassword ?? true;
    this.form = this.fb.group({
      passwordActual: ['', [Validators.required, Validators.minLength(6)]],
      passwordNueva: ['', [Validators.required, Validators.minLength(6)]],
      passwordNuevaConfirmar: ['', [Validators.required]],
      email: [null, requiereEmail ? [Validators.required, Validators.email] : [Validators.email]],
    });
  }

  get requiereEmail(): boolean {
    return this.auth.currentUser()?.requiereCambioPassword ?? true;
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const pn = this.form.get('passwordNueva')?.value;
    const pnc = this.form.get('passwordNuevaConfirmar')?.value;
    if (pn !== pnc) {
      this.form.get('passwordNuevaConfirmar')?.setErrors({ mismatch: true });
      return;
    }

    this.loading = true;
    this.error = '';

    const dto = {
      passwordActual: this.form.get('passwordActual')?.value,
      passwordNueva: pn,
      email: this.form.get('email')?.value?.trim() || undefined,
    };

    this.auth.cambiarPassword(dto).subscribe({
      next: () => {
        this.auth.marcarPasswordCambiada();
        this.loading = false;
        if (this.auth.isPlatformAdmin()) {
          this.router.navigate(['/platform']);
        } else {
          this.router.navigate(['/']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error?.message || err.error?.message || 'Error al cambiar la contraseña';
      },
    });
  }
}
