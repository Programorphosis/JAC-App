import { Component, OnInit } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
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
export class RecuperarContrasenaComponent implements OnInit {
  step: 1 | 2 = 1;
  emailEnviado = '';
  formPaso1: FormGroup;
  formPaso2: FormGroup;
  loading = false;
  error = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly title: Title,
    private readonly meta: Meta,
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

  ngOnInit(): void {
    this.title.setTitle('Recuperar contraseña – JAC App');
    this.meta.updateTag({
      name: 'description',
      content: 'Recupera el acceso a tu cuenta de JAC App mediante código de verificación por correo.',
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

  /** Email enmascarado para reducir exposición (ej. j***@e***.com). */
  get emailEnmascarado(): string {
    const e = this.emailEnviado;
    if (!e) return '';
    const [local, domain] = e.split('@');
    if (!local || !domain) return e;
    const localMask = local.length <= 2 ? local + '***' : local[0]! + '***';
    const [dom, ext] = domain.split('.');
    const domMask = dom && dom.length > 0 ? dom[0]! + '***' : '***';
    return `${localMask}@${domMask}.${ext || ''}`;
  }
}
