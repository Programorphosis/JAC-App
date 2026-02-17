import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtUser } from '../strategies/jwt.strategy';

/**
 * PA-8: Permite acceso solo cuando el usuario está en modo impersonación.
 * Usado para POST /platform/salir-impersonacion.
 */
@Injectable()
export class ImpersonacionSalirGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    if (!user.impersonando) {
      throw new ForbiddenException('No está en modo impersonación');
    }

    return true;
  }
}
