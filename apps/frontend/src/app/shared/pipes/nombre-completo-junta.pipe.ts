import { Pipe, PipeTransform } from '@angular/core';
import { nombreCompletoJunta as formatear } from '../utils/nombre-completo-junta.util';

/**
 * Concatena el prefijo "Junta de Acción Comunal de" al nombre (jurisdicción) de la junta.
 * El nombre en BD debe ser solo la jurisdicción (ej: Vereda Rubiales, Barrio Centro).
 */
@Pipe({ name: 'nombreCompletoJunta', standalone: true })
export class NombreCompletoJuntaPipe implements PipeTransform {
  transform(jurisdiccion: string | null | undefined): string {
    return formatear(jurisdiccion);
  }
}
