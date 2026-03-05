import {
  IsNumber,
  IsDateString,
  IsOptional,
  IsString,
  IsObject,
  IsIn,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

const TIPOS_VALIDOS = ['MENSUAL', 'MANUAL', 'AJUSTE'] as const;

export class CrearFacturaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor a cero' })
  monto!: number;

  @IsDateString({}, { message: 'Fecha de vencimiento inválida' })
  fechaVencimiento!: string;

  @IsOptional()
  @IsIn(TIPOS_VALIDOS)
  tipo?: (typeof TIPOS_VALIDOS)[number];

  @IsOptional()
  @IsString()
  referenciaExterna?: string;

  @IsOptional()
  @IsObject()
  metadata?: Record<string, unknown>;
}
