import { Component, EventEmitter, Output } from '@angular/core';
import { FormBuilder, FormGroup, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { CreateRequisitoTipoBody } from '../services/requisitos.service';

@Component({
  selector: 'app-requisito-form',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatCheckboxModule,
  ],
  templateUrl: './requisito-form.component.html',
  styleUrl: './requisito-form.component.scss',
})
export class RequisitoFormComponent {
  @Output() guardar = new EventEmitter<CreateRequisitoTipoBody>();
  @Output() cancelar = new EventEmitter<void>();

  form: FormGroup;

  constructor(private readonly fb: FormBuilder) {
    this.form = this.fb.group({
      nombre: ['', Validators.required],
      tieneCorteAutomatico: [true],
    });
  }

  onSubmit(): void {
    if (this.form.invalid) return;
    const v = this.form.value;
    this.guardar.emit({
      nombre: v.nombre,
      tieneCorteAutomatico: v.tieneCorteAutomatico,
    });
  }

  onCancelar(): void {
    this.cancelar.emit();
  }
}
