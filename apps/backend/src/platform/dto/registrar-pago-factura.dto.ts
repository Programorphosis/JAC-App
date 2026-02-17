import { IsNumber, IsString, IsOptional, IsIn, Min } from 'class-validator';
import { Type } from 'class-transformer';

const METODOS_VALIDOS = ['EFECTIVO', 'TRANSFERENCIA', 'ONLINE', 'CHEQUE', 'OTRO'] as const;

export class RegistrarPagoFacturaDto {
  @Type(() => Number)
  @IsNumber()
  @Min(0.01, { message: 'El monto debe ser mayor a cero' })
  monto: number;

  @IsIn(METODOS_VALIDOS, { message: 'Método de pago inválido' })
  metodo: (typeof METODOS_VALIDOS)[number];

  @IsOptional()
  @IsString()
  referencia?: string;

  @IsOptional()
  @IsString()
  referenciaExterna?: string;
}
