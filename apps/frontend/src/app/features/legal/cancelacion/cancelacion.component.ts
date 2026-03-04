import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Title, Meta } from '@angular/platform-browser';
import { LegalNavService } from '../services/legal-nav.service';

@Component({
  selector: 'app-cancelacion',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './cancelacion.component.html',
  styleUrl: './cancelacion.component.scss',
})
export class CancelacionComponent implements OnInit {
  private readonly nav = inject(LegalNavService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly sections = [
    { id: 'cancelacion', label: '1. Cancelación de la suscripción' },
    { id: 'reembolsos', label: '2. Reembolsos' },
    { id: 'acceso', label: '3. Acceso tras la cancelación' },
    { id: 'exportacion', label: '4. Exportación de datos' },
    { id: 'retencion-datos', label: '5. Retención de datos tras cancelación' },
    { id: 'consultas', label: '6. Consultas' },
    { id: 'marco-legal', label: '7. Marco legal de referencia' },
  ];

  ngOnInit() {
    this.title.setTitle('Cancelación y reembolsos – JAC App');
    this.meta.updateTag({
      name: 'description',
      content: 'Política de cancelación de suscripción, reembolsos y exportación de datos de JAC App.',
    });
    this.nav.setSections(this.sections);
  }
}
