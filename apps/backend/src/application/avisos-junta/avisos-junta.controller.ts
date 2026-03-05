import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { AuthGuard } from '@nestjs/passport';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { AvisosJuntaService } from './avisos-junta.service';
import { CrearAvisoJuntaDto } from './dto/crear-aviso-junta.dto';
import { ActualizarAvisoJuntaDto } from './dto/actualizar-aviso-junta.dto';

/**
 * Avisos de junta – comunicados admin/secretaria → afiliados.
 * Rutas: /api/avisos-junta
 * Independiente de /api/avisos (platform) y /api/platform/avisos (platform admin).
 */
@ApiTags('avisos-junta')
@Controller('avisos-junta')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class AvisosJuntaController {
  constructor(private readonly avisos: AvisosJuntaService) {}

  @Get()
  async listarActivos(@Request() req: { user: JwtUser }) {
    const user = req.user;
    return this.avisos.listarActivos(user.juntaId ?? null);
  }

  @Get('gestion')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async listarTodos(
    @Request() req: { user: JwtUser },
    @Query('activo') activo?: string,
  ) {
    const juntaId = req.user.juntaId!;
    const activoFilter =
      activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.avisos.listarTodos(juntaId, activoFilter);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async crear(
    @Request() req: { user: JwtUser },
    @Body() body: CrearAvisoJuntaDto,
  ) {
    const juntaId = req.user.juntaId!;
    return this.avisos.crear(juntaId, req.user, body);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async actualizar(
    @Param('id') id: string,
    @Request() req: { user: JwtUser },
    @Body() body: ActualizarAvisoJuntaDto,
  ) {
    const juntaId = req.user.juntaId!;
    return this.avisos.actualizar(id, juntaId, req.user, body);
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async eliminar(@Param('id') id: string, @Request() req: { user: JwtUser }) {
    const juntaId = req.user.juntaId!;
    return this.avisos.eliminar(id, juntaId, req.user);
  }
}
