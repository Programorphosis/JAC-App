import { SetMetadata } from '@nestjs/common';
import { RolNombre } from '@prisma/client';

export const ROLES_KEY = 'roles';

/**
 * Decorador para exigir uno o más roles.
 * Uso: @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
 */
export const Roles = (...roles: RolNombre[]) => SetMetadata(ROLES_KEY, roles);
