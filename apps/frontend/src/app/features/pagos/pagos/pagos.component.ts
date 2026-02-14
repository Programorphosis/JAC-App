import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { PagosService } from '../services/pagos.service';
import { UsuariosService, UsuarioListItem } from '../../usuarios/services/usuarios.service';

@Component({
  selector: 'app-pagos',
  standalone: true,
  imports: [
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSelectModule,
    ReactiveFormsModule,
  ],
  templateUrl: './pagos.component.html',
  styleUrl: './pagos.component.scss',
})
export class PagosComponent implements OnInit {
  usuarios: UsuarioListItem[] = [];
  formEfectivo: FormGroup;
  formCarta: FormGroup;
  loading = false;

  constructor(
    private readonly pagos: PagosService,
    private readonly usuariosSvc: UsuariosService,
    private readonly fb: FormBuilder,
    private readonly snackBar: MatSnackBar
  ) {
    this.formEfectivo = this.fb.group({
      usuarioId: ['', Validators.required],
      metodo: ['EFECTIVO', Validators.required],
      referenciaExterna: [''],
    });
    this.formCarta = this.fb.group({
      usuarioId: ['', Validators.required],
      metodo: ['EFECTIVO', Validators.required],
      referenciaExterna: [''],
    });
  }

  ngOnInit(): void {
    this.usuariosSvc.listar(1, 500).subscribe({
      next: (res) => (this.usuarios = res.data),
    });
  }

  registrarEfectivo(): void {
    if (this.formEfectivo.invalid) return;
    const v = this.formEfectivo.value;
    if (v.metodo === 'TRANSFERENCIA' && !v.referenciaExterna?.trim()) {
      this.snackBar.open('Referencia es obligatoria para transferencia', 'Cerrar', { duration: 3000 });
      return;
    }
    this.loading = true;
    this.pagos.registrarEfectivo({
      usuarioId: v.usuarioId,
      metodo: v.metodo,
      referenciaExterna: v.referenciaExterna?.trim() || undefined,
    }).subscribe({
      next: (r) => {
        this.loading = false;
        this.snackBar.open(`Pago registrado. Consecutivo: ${r.consecutivo}`, 'Cerrar', { duration: 4000 });
        this.formEfectivo.reset({ metodo: 'EFECTIVO' });
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.error?.message || err.error?.message || 'Error', 'Cerrar', { duration: 5000 });
      },
    });
  }

  registrarCarta(): void {
    if (this.formCarta.invalid) return;
    const v = this.formCarta.value;
    if (v.metodo === 'TRANSFERENCIA' && !v.referenciaExterna?.trim()) {
      this.snackBar.open('Referencia es obligatoria para transferencia', 'Cerrar', { duration: 3000 });
      return;
    }
    this.loading = true;
    this.pagos.registrarCarta({
      usuarioId: v.usuarioId,
      metodo: v.metodo,
      referenciaExterna: v.referenciaExterna?.trim() || undefined,
    }).subscribe({
      next: (r) => {
        this.loading = false;
        this.snackBar.open(`Pago carta registrado. Consecutivo: ${r.consecutivo}`, 'Cerrar', { duration: 4000 });
        this.formCarta.reset({ metodo: 'EFECTIVO' });
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.error?.message || err.error?.message || 'Error', 'Cerrar', { duration: 5000 });
      },
    });
  }

  pagarOnlineJunta(usuarioId: string): void {
    this.loading = true;
    this.pagos.crearIntencionOnline(usuarioId).subscribe({
      next: (r) => {
        this.loading = false;
        window.location.href = r.checkoutUrl;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.error?.message || err.error?.message || 'Error', 'Cerrar', { duration: 5000 });
      },
    });
  }

  pagarOnlineCarta(usuarioId: string): void {
    this.loading = true;
    this.pagos.crearIntencionCartaOnline(usuarioId).subscribe({
      next: (r) => {
        this.loading = false;
        window.location.href = r.checkoutUrl;
      },
      error: (err) => {
        this.loading = false;
        this.snackBar.open(err.error?.error?.message || err.error?.message || 'Error', 'Cerrar', { duration: 5000 });
      },
    });
  }

  nombreUsuario(u: UsuarioListItem): string {
    return `${u.nombres} ${u.apellidos} (${u.tipoDocumento} ${u.numeroDocumento})`;
  }
}
