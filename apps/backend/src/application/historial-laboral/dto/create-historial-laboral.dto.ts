import { IsString, IsDateString, IsOptional, IsIn } from 'class-validator';

export class CreateHistorialLaboralDto {
  @IsString()
  @IsIn(['TRABAJANDO', 'NO_TRABAJANDO'])
  estado: 'TRABAJANDO' | 'NO_TRABAJANDO';

  @IsDateString()
  fechaInicio: string;

  @IsOptional()
  @IsDateString()
  fechaFin?: string;
}
