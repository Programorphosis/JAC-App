import { Controller, Get, UseGuards, Req } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { PlatformAvisosService } from './platform-avisos.service';

/**
 * Avisos activos para usuarios de junta.
 * GET /api/avisos – lista avisos con alcance TODAS_JUNTAS o JUNTA_ESPECIFICA para la junta del usuario.
 * Requiere juntaId en JWT (usuario de junta o admin impersonando).
 */
@Controller('avisos')
@UseGuards(AuthGuard('jwt'))
export class PlatformAvisosPublicController {
  constructor(private readonly avisos: PlatformAvisosService) {}

  @Get()
  async listarActivos(@Req() req: Request) {
    const user = req.user as JwtUser;
    return this.avisos.listarActivos(user.juntaId ?? null, user);
  }
}