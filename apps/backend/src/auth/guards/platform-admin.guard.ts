import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../strategies/jwt.strategy';

@Injectable()
export class PlatformAdminGuard implements CanActivate {
  constructor(private reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    const isPlatformAdmin =
      user.roles.includes(RolNombre.PLATFORM_ADMIN) && user.juntaId === null;

    if (!isPlatformAdmin) {
      throw new ForbiddenException('Se requiere rol PLATFORM_ADMIN');
    }

    return true;
  }
}
