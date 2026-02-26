import { Component, OnInit } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { DatePipe } from '@angular/common';
import { AvisosService, AvisoPlataforma } from '../../../core/services/avisos.service';

@Component({
  selector: 'app-avisos-list',
  standalone: true,
  imports: [MatCardModule, MatIconModule, MatProgressSpinnerModule, DatePipe],
  templateUrl: './avisos-list.component.html',
  styleUrl: './avisos-list.component.scss',
})
export class AvisosListComponent implements OnInit {
  avisos: AvisoPlataforma[] = [];
  loading = true;

  constructor(private readonly avisosSvc: AvisosService) {}

  ngOnInit(): void {
    this.avisosSvc.listarActivos().subscribe({
      next: (a) => {
        this.avisos = a;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }
}
