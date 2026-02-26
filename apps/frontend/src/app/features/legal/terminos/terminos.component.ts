import { Component, inject, OnInit } from '@angular/core';
import { RouterLink } from '@angular/router';
import { LegalNavService } from '../services/legal-nav.service';

@Component({
  selector: 'app-terminos',
  standalone: true,
  imports: [RouterLink],
  templateUrl: './terminos.component.html',
  styleUrl: './terminos.component.scss',
})
export class TerminosComponent implements OnInit {
  private readonly nav = inject(LegalNavService);

  readonly sections = [
    { id: 'alcance', label: '1. Alcance del servicio' },
    { id: 'partes', label: '2. Partes' },
    { id: 'obligaciones-proveedor', label: '3. Obligaciones del proveedor' },
    { id: 'obligaciones-cliente', label: '4. Obligaciones del cliente' },
    { id: 'uso-aceptable', label: '5. Uso aceptable' },
    { id: 'limitacion', label: '6. Limitación de responsabilidad' },
    { id: 'propiedad', label: '7. Propiedad intelectual' },
    { id: 'modificaciones', label: '8. Modificaciones' },
    { id: 'ley-jurisdiccion', label: '9. Ley aplicable y jurisdicción' },
    { id: 'duracion-terminacion', label: '10. Duración y terminación' },
    { id: 'devolucion-datos', label: '11. Devolución de datos' },
    { id: 'marco-legal', label: '12. Marco legal de referencia' },
  ];

  ngOnInit() {
    this.nav.setSections(this.sections);
  }
}
