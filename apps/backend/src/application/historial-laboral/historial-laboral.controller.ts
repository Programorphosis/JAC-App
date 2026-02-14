import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { HistorialLaboralService } from './historial-laboral.service';
import { CreateHistorialLaboralDto } from './dto/create-historial-laboral.dto';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolNombre } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtUser } from '../../auth/strategies/jwt.strategy';

@Controller('usuarios/:usuarioId/historial-laboral')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class HistorialLaboralController {
  constructor(private readonly historial: HistorialLaboralService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA)
  async listar(
    @Param('usuarioId') usuarioId: string,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.historial.listar(usuarioId, juntaId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async crear(
    @Param('usuarioId') usuarioId: string,
    @Body() dto: CreateHistorialLaboralDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.historial.crear(usuarioId, dto, juntaId, req.user.id);
  }
}
