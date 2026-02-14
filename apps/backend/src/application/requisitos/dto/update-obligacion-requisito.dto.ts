import { IsBoolean } from 'class-validator';

export class UpdateObligacionRequisitoDto {
  @IsBoolean()
  obligacionActiva: boolean;
}
