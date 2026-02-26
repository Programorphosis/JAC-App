import { IsOptional, IsString, MaxLength } from 'class-validator';

export class CancelarSuscripcionDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivo?: string;
}
