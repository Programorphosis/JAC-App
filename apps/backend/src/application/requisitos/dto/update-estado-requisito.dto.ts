import { IsIn } from 'class-validator';

export class UpdateEstadoRequisitoDto {
  @IsIn(['AL_DIA', 'MORA'])
  estado: 'AL_DIA' | 'MORA';
}
