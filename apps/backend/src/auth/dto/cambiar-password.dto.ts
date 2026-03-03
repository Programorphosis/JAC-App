import { IsString, MinLength, IsOptional, IsEmail } from 'class-validator';

/**
 * DTO para cambiar contraseña (autenticado).
 * Si requiereCambioPassword=true, email es obligatorio (primera vez).
 */
export class CambiarPasswordDto {
  @IsString()
  @MinLength(6, { message: 'La contraseña actual debe tener al menos 6 caracteres' })
  passwordActual: string;

  @IsString()
  @MinLength(6, { message: 'La nueva contraseña debe tener al menos 6 caracteres' })
  passwordNueva: string;

  /** Obligatorio cuando es el primer cambio (requiereCambioPassword). Para futuras recuperaciones. */
  @IsOptional()
  @IsEmail({}, { message: 'Debe ser un correo electrónico válido' })
  email?: string;
}
