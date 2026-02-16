import { Pipe, PipeTransform } from '@angular/core';
import { formatearNombre as formatear } from '../utils/formatear-nombre.util';

/** Formatea nombres con inicial de cada palabra en mayúscula. Ej: "juan carlos" → "Juan Carlos" */
@Pipe({ name: 'formatearNombre', standalone: true })
export class FormatearNombrePipe implements PipeTransform {
  transform(texto: string | null | undefined): string {
    return formatear(texto);
  }
}
