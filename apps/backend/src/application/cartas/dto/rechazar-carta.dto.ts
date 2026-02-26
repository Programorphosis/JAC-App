import { IsOptional, IsString, MaxLength } from 'class-validator';

export class RechazarCartaDto {
  @IsOptional()
  @IsString()
  @MaxLength(500)
  motivoRechazo?: string;
}
