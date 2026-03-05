import { IsString, MinLength, IsOptional, IsEmail } from 'class-validator';

/**
 * DTO para cambiar contraseña (autenticado).
 * - Si requiereCambioPassword=true: passwordActual no se envía (el usuario ya se autenticó).
 * - Si requiereCambioPassword=false: passwordActual es obligatorio.
 */
export class CambiarPasswordDto {
  /** Opcional cuando es primer cambio (requiereCambioPassword). Obligatorio en cambio normal. */
  @IsOptional()
  @IsString()
  @MinLength(6, {
    message: 'La contraseña actual debe tener al menos 6 caracteres',
  })
  passwordActual?: string;

  @IsString()
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres',
  })
  passwordNueva!: string;

  /** Obligatorio cuando es el primer cambio (requiereCambioPassword). Para futuras recuperaciones. */
  @IsOptional()
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  email?: string;

  /** Código de 6 dígitos enviado al email. Obligatorio cuando requiereCambioPassword. */
  @IsOptional()
  @IsString()
  codigo?: string;
}
