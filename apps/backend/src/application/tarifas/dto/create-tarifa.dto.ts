import { IsString, IsInt, IsDateString, IsIn } from 'class-validator';
import { Type } from 'class-transformer';

export class CreateTarifaDto {
  @IsString()
  @IsIn(['TRABAJANDO', 'NO_TRABAJANDO'])
  estadoLaboral: 'TRABAJANDO' | 'NO_TRABAJANDO';

  @Type(() => Number)
  @IsInt()
  valorMensual: number;

  @IsDateString()
  fechaVigencia: string;
}
