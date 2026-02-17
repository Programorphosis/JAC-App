import { IsUUID } from 'class-validator';

/**
 * DTO para crear intención de pago online de factura.
 * FACTURACION_PLATAFORMA_PAGO_ONLINE_ANALISIS.md
 */
export class CrearIntencionPagoFacturaDto {
  @IsUUID('4', { message: 'facturaId debe ser un UUID válido' })
  facturaId: string;
}
