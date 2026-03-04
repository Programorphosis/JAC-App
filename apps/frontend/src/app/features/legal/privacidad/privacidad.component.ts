import { Component, inject, OnInit } from '@angular/core';
import { Title, Meta } from '@angular/platform-browser';
import { LegalNavService } from '../services/legal-nav.service';

@Component({
  selector: 'app-privacidad',
  standalone: true,
  imports: [],
  templateUrl: './privacidad.component.html',
  styleUrl: './privacidad.component.scss',
})
export class PrivacidadComponent implements OnInit {
  private readonly nav = inject(LegalNavService);
  private readonly title = inject(Title);
  private readonly meta = inject(Meta);

  readonly sections = [
    { id: 'responsable', label: '1. Responsable del tratamiento' },
    { id: 'datos', label: '2. Datos que recogemos' },
    { id: 'finalidad', label: '3. Finalidad del tratamiento' },
    { id: 'base-legal', label: '4. Base legal' },
    { id: 'terceros', label: '5. Compartir con terceros' },
    { id: 'transferencias', label: '6. Transferencias internacionales' },
    { id: 'retencion', label: '7. Retención' },
    { id: 'derechos', label: '8. Derechos del titular' },
    { id: 'canal', label: '9. Canal para ejercer derechos' },
    { id: 'cambios', label: '10. Cambios en la política' },
    { id: 'cookies', label: '11. Cookies y tecnologías' },
    { id: 'rnbd', label: '12. Registro Nacional de Bases de Datos' },
    { id: 'marco-legal', label: '13. Marco legal de referencia' },
  ];

  ngOnInit() {
    this.title.setTitle('Política de privacidad – JAC App');
    this.meta.updateTag({
      name: 'description',
      content: 'Política de privacidad y tratamiento de datos personales de JAC App.',
    });
    this.nav.setSections(this.sections);
  }
}
