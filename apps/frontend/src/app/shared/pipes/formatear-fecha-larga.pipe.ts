import { Pipe, PipeTransform } from '@angular/core';
import { formatearFechaLarga } from '../utils/formatear-fecha-larga.util';

@Pipe({ name: 'formatearFechaLarga', standalone: true })
export class FormatearFechaLargaPipe implements PipeTransform {
  transform(value: string | Date | null | undefined): string {
    return formatearFechaLarga(value);
  }
}
