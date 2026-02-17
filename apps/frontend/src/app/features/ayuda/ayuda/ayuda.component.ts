import { Component } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-ayuda',
  standalone: true,
  imports: [MatCardModule, MatIconModule],
  templateUrl: './ayuda.component.html',
  styleUrl: './ayuda.component.scss',
})
export class AyudaComponent {}
