import { Component, OnInit } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatIconModule } from '@angular/material/icon';
import { RouterLink } from '@angular/router';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatButtonModule,
    MatCheckboxModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss',
})
export class LoginComponent implements OnInit {
  form: FormGroup;
  loading = false;
  error = '';

  mensajeExito = '';

  constructor(
    private readonly fb: FormBuilder,
    private readonly auth: AuthService,
    private readonly router: Router,
    private readonly route: ActivatedRoute
  ) {
    this.form = this.fb.group({
      tipoDocumento: ['CC', Validators.required],
      numeroDocumento: ['', [Validators.required, Validators.minLength(5)]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      platformAdmin: [false],
    });
  }

  ngOnInit(): void {
    this.mensajeExito = this.route.snapshot.queryParamMap.get('mensaje') ?? '';
    if (this.auth.isAuthenticated()) {
      const user = this.auth.currentUser();
      if (user?.requiereCambioPassword) {
        this.router.navigate(['/cambiar-password']);
      } else {
        this.router.navigate([this.auth.isPlatformAdmin() ? '/platform' : '/']);
      }
    }
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = '';

    const value = this.form.value;
    this.auth
      .login({
        tipoDocumento: value.tipoDocumento,
        numeroDocumento: value.numeroDocumento,
        password: value.password,
        juntaId: value.platformAdmin ? 'platform' : undefined,
      })
      .subscribe({
        next: () => {
          this.loading = false;
          const user = this.auth.currentUser();
          if (user?.requiereCambioPassword) {
            this.router.navigate(['/cambiar-password']);
          } else if (this.auth.isPlatformAdmin()) {
            this.router.navigate(['/platform']);
          } else {
            this.router.navigate(['/']);
          }
        },
        error: (err) => {
          this.loading = false;
          this.error = err.error?.error?.message || err.error?.message || 'Credenciales inválidas';
        },
      });
  }
}
