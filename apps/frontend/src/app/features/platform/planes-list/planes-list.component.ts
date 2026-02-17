import { Component, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { DecimalPipe } from '@angular/common';
import { PlatformPlanesService, Plan } from '../services/platform-planes.service';

@Component({
  selector: 'app-planes-list',
  standalone: true,
  imports: [MatCardModule, MatIconModule, RouterLink, DecimalPipe],
  templateUrl: './planes-list.component.html',
  styleUrl: './planes-list.component.scss',
})
export class PlanesListComponent implements OnInit {
  planes: Plan[] = [];
  loading = true;

  constructor(private readonly planesService: PlatformPlanesService) {}

  ngOnInit(): void {
    this.planesService.listar().subscribe({
      next: (p) => {
        this.planes = p;
        this.loading = false;
      },
      error: () => (this.loading = false),
    });
  }

  limiteTexto(val: number | null): string {
    return val == null ? 'Ilimitado' : val.toString();
  }
}
