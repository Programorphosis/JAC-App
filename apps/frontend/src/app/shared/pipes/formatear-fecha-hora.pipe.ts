import { Pipe, PipeTransform } from '@angular/core';
import { formatearFechaHora as formatear } from '../utils/formatear-fecha.util';

/** Formatea fecha y hora (dd/MM/yyyy, hh:mm:ss). Locale es-CO. */
@Pipe({ name: 'formatearFechaHora', standalone: true })
export class FormatearFechaHoraPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatear(value);
  }
}
