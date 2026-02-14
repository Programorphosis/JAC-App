import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../strategies/jwt.strategy';
import { ROLES_KEY } from '../decorators/roles.decorator';

/**
 * Guard que verifica que el usuario tenga al menos uno de los roles requeridos.
 * Usar junto con @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<RolNombre[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user: JwtUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const hasRole = requiredRoles.some((role) => user.roles.includes(role));

    if (!hasRole) {
      throw new ForbiddenException(
        `Se requiere uno de los roles: ${requiredRoles.join(', ')}`,
      );
    }

    return true;
  }
}
