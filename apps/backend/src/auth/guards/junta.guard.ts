import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { JwtUser } from '../strategies/jwt.strategy';

/**
 * Guard que exige que el usuario pertenezca a una junta (juntaId no null).
 * Para operaciones de junta: usuarios, historial, tarifas, etc.
 * Platform Admin (juntaId null) no puede acceder a estas rutas.
 */
@Injectable()
export class JuntaGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest();
    const user: JwtUser | undefined = request.user;

    if (!user) {
      throw new ForbiddenException('No autenticado');
    }

    if (user.juntaId === null || user.juntaId === undefined) {
      throw new ForbiddenException('Operación requiere pertenecer a una junta');
    }

    return true;
  }
}
