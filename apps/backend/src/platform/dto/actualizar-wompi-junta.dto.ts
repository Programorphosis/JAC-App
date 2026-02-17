import { IsString, IsOptional, IsIn, MaxLength } from 'class-validator';

/**
 * DTO para PATCH /platform/juntas/:id/wompi.
 * Todos los campos opcionales. String vacío = borrar (guardar null).
 * WOMPI_POR_JUNTA_DOC §3.1
 */
export class ActualizarWompiJuntaDto {
  @IsOptional()
  @IsString()
  @MaxLength(200)
  wompiPrivateKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  wompiPublicKey?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  wompiIntegritySecret?: string | null;

  @IsOptional()
  @IsString()
  @MaxLength(200)
  wompiEventsSecret?: string | null;

  @IsOptional()
  @IsString()
  @IsIn(['sandbox', 'production'])
  wompiEnvironment?: string | null;
}
