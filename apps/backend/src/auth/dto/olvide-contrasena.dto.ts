import { IsEmail, IsString, MinLength } from 'class-validator';

export class OlvideContrasenaDto {
  @IsEmail({}, { message: 'Debe indicar un correo electrónico válido' })
  email!: string;
}

export class VerificarCodigoRecuperacionDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(6, { message: 'El código debe tener 6 caracteres' })
  codigo!: string;

  @IsString()
  @MinLength(6, {
    message: 'La nueva contraseña debe tener al menos 6 caracteres',
  })
  passwordNueva!: string;
}
