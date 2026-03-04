import { Component } from '@angular/core';
import { Router } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../../core/auth/auth.service';

/** Enmascara email para mostrar: j***@e***.com */
function enmascararEmail(email: string): string {
  const [local, domain] = email.split('@');
  if (!local || !domain) return email;
  const localMask = local.length <= 2 ? local + '***' : local[0]! + '***';
  const [dom, ext] = domain.split('.');
  const domMask = dom && dom.length > 0 ? dom[0]! + '***' : '***';
  return `${localMask}@${domMask}.${ext || ''}`;
}

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
  /** Paso 2 del flujo primer login: código enviado, mostrar campo código. */
  codigoEnviado = false;
  emailParaCodigo = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {
    const requiereCambio = this.auth.currentUser()?.requiereCambioPassword ?? true;
    this.form = this.fb.group({
      passwordActual: [
        '',
        requiereCambio ? [] : [Validators.required, Validators.minLength(6)],
      ],
      passwordNueva: ['', [Validators.required, Validators.minLength(6)]],
      passwordNuevaConfirmar: ['', [Validators.required]],
      email: [
        null,
        requiereCambio ? [Validators.required, Validators.email] : [Validators.email],
      ],
      codigo: [null, requiereCambio ? [] : []],
    });
  }

  /** true = primer login, flujo en dos pasos (enviar código → verificar). */
  get requiereCambioPassword(): boolean {
    return this.auth.currentUser()?.requiereCambioPassword ?? true;
  }

  get requiereEmail(): boolean {
    return this.requiereCambioPassword;
  }

  /** Paso 1: solicitar código al email. */
  enviarCodigo(): void {
    const email = this.form.get('email')?.value?.trim();
    if (!email || this.form.get('email')?.invalid) {
      this.form.get('email')?.markAsTouched();
      return;
    }
    this.loading = true;
    this.error = '';
    this.auth.solicitarVerificacionEmail(email).subscribe({
      next: () => {
        this.codigoEnviado = true;
        this.emailParaCodigo = email;
        this.form.get('codigo')?.setValidators([Validators.required, Validators.minLength(6), Validators.maxLength(6)]);
        this.form.get('codigo')?.updateValueAndValidity();
        this.loading = false;
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error?.message || err.error?.message || 'Error al enviar el código';
      },
    });
  }

  /** Email enmascarado para mostrar en paso 2. */
  get emailEnmascarado(): string {
    return this.emailParaCodigo ? enmascararEmail(this.emailParaCodigo) : '';
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

    const dto: { passwordActual?: string; passwordNueva: string; email?: string; codigo?: string } = {
      passwordNueva: pn,
      email: this.form.get('email')?.value?.trim() || undefined,
      codigo: this.form.get('codigo')?.value?.trim() || undefined,
    };
    if (!this.requiereCambioPassword) {
      dto.passwordActual = this.form.get('passwordActual')?.value;
      delete dto.codigo;
    }

    this.auth.cambiarPassword(dto).subscribe({
      next: () => {
        this.auth.marcarPasswordCambiada();
        this.loading = false;
        if (this.auth.isPlatformAdmin()) {
          this.router.navigate(['/app/platform']);
        } else {
          this.router.navigate(['/app']);
        }
      },
      error: (err) => {
        this.loading = false;
        this.error = err.error?.error?.message || err.error?.message || 'Error al cambiar la contraseña';
      },
    });
  }
}
