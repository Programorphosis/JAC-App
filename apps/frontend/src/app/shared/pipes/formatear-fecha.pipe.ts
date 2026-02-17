import { Pipe, PipeTransform } from '@angular/core';
import { formatearFecha as formatear } from '../utils/formatear-fecha.util';

/** Formatea fecha (dd/MM/yyyy). Locale es-CO. */
@Pipe({ name: 'formatearFecha', standalone: true })
export class FormatearFechaPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatear(value);
  }
}
