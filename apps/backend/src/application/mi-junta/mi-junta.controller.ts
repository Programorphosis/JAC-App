import { Controller, Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { MiJuntaService } from './mi-junta.service';
import { ActualizarWompiJuntaDto } from '../../platform/dto/actualizar-wompi-junta.dto';

/**
 * Información de la junta del usuario autenticado.
 * GET /api/mi-junta – datos de la junta (solo lectura).
 * PATCH /api/mi-junta/wompi – configurar Wompi (solo ADMIN).
 * Requiere juntaId en JWT (usuarios de junta, no platform admin sin impersonar).
 */
@Controller('mi-junta')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class MiJuntaController {
  constructor(private readonly miJunta: MiJuntaService) {}

  @Get()
  async obtener(@Request() req: { user: JwtUser }) {
    const juntaId = req.user.juntaId!;
    return this.miJunta.obtener(juntaId);
  }

  @Patch('wompi')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN)
  async actualizarWompi(
    @Body() body: ActualizarWompiJuntaDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.miJunta.actualizarWompi(juntaId, body, req.user.id);
  }
}
