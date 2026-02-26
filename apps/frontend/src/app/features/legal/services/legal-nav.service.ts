import { Injectable, signal } from '@angular/core';

export interface LegalSection {
  id: string;
  label: string;
}

@Injectable({ providedIn: 'root' })
export class LegalNavService {
  /** Secciones del documento actual para el menú lateral */
  readonly sections = signal<LegalSection[]>([]);

  setSections(sections: LegalSection[]) {
    this.sections.set(sections);
  }

  clearSections() {
    this.sections.set([]);
  }
}
