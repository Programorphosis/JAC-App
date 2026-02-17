import { IsString, IsOptional, IsDateString, IsIn } from 'class-validator';

const ESTADOS_VALIDOS = ['ACTIVA', 'SUSPENDIDA', 'CANCELADA', 'PRUEBA', 'VENCIDA'] as const;

export class ActualizarSuscripcionDto {
  @IsOptional()
  @IsString()
  planId?: string;

  @IsOptional()
  @IsDateString()
  fechaVencimiento?: string;

  @IsOptional()
  @IsIn(ESTADOS_VALIDOS)
  estado?: (typeof ESTADOS_VALIDOS)[number];
}
