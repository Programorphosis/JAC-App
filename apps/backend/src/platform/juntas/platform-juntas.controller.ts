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
import { AuthGuard } from '@nestjs/passport';
import { PlatformJuntasService } from './platform-juntas.service';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { CreateJuntaAdminUser } from '../../application/junta/junta.service';
import { CrearSuscripcionDto } from '../dto/crear-suscripcion.dto';
import { ActualizarSuscripcionDto } from '../dto/actualizar-suscripcion.dto';
import { CambiarAdminDto } from '../dto/cambiar-admin.dto';
import { ActualizarJuntaDto } from '../dto/actualizar-junta.dto';

@Controller('platform/juntas')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformJuntasController {
  constructor(private readonly juntas: PlatformJuntasService) {}

  @Get()
  async listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('activo') activo?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    const activoFilter =
      activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.juntas.listar(p, l, activoFilter);
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    return this.juntas.obtener(id);
  }

  @Get(':id/usuarios')
  async listarUsuarios(@Param('id') id: string) {
    return this.juntas.listarUsuarios(id);
  }

  @Get(':id/resumen')
  async resumen(@Param('id') id: string) {
    return this.juntas.resumen(id);
  }

  @Get(':id/uso')
  async uso(@Param('id') id: string) {
    return this.juntas.uso(id);
  }

  @Get(':id/alertas')
  async alertas(@Param('id') id: string) {
    return this.juntas.alertas(id);
  }

  @Get(':id/suscripcion')
  async obtenerSuscripcion(@Param('id') id: string) {
    return this.juntas.obtenerSuscripcion(id);
  }

  @Post(':id/suscripcion')
  async crearSuscripcion(
    @Param('id') id: string,
    @Body() body: CrearSuscripcionDto,
    @Request() req: { user: JwtUser },
  ) {
    return this.juntas.crearSuscripcion(id, body.planId, body.diasPrueba, req.user.id);
  }

  @Patch(':id/suscripcion')
  async actualizarSuscripcion(
    @Param('id') id: string,
    @Body() body: ActualizarSuscripcionDto,
    @Request() req: { user: JwtUser },
  ) {
    return this.juntas.actualizarSuscripcion(id, body, req.user.id);
  }

  @Post(':id/admin/reset-password')
  async resetPasswordAdmin(
    @Param('id') id: string,
    @Request() req: { user: JwtUser },
  ) {
    return this.juntas.resetPasswordAdmin(id, req.user.id);
  }

  @Patch(':id/admin')
  async cambiarAdmin(
    @Param('id') id: string,
    @Body() body: CambiarAdminDto,
    @Request() req: { user: JwtUser },
  ) {
    return this.juntas.cambiarAdmin(id, body.nuevoAdminUsuarioId, req.user.id);
  }

  @Post(':id/admin/reenviar-credenciales')
  async reenviarCredencialesAdmin(
    @Param('id') id: string,
    @Request() req: { user: JwtUser },
  ) {
    return this.juntas.reenviarCredencialesAdmin(id, req.user.id);
  }

  @Patch(':id/admin/bloquear')
  async bloquearAdmin(
    @Param('id') id: string,
    @Request() req: { user: JwtUser },
  ) {
    return this.juntas.bloquearAdmin(id, req.user.id);
  }

  @Post()
  async crear(
    @Body()
    body: {
      nombre: string;
      nit?: string;
      montoCarta?: number;
      adminUser: CreateJuntaAdminUser;
      planId?: string;
      diasPrueba?: number;
    },
    @Request() req: { user: JwtUser },
  ) {
    return this.juntas.crear(body, req.user.id);
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() body: ActualizarJuntaDto,
    @Request() req: { user: JwtUser },
  ) {
    return this.juntas.actualizar(id, body, req.user.id);
  }

  @Delete(':id')
  async darBaja(@Param('id') id: string, @Request() req: { user: JwtUser }) {
    return this.juntas.darBaja(id, req.user.id);
  }
}
