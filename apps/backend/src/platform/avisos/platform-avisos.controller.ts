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
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';
import { PlatformAvisosService } from './platform-avisos.service';
import { CrearAvisoDto } from '../dto/crear-aviso.dto';
import { ActualizarAvisoDto } from '../dto/actualizar-aviso.dto';

/**
 * PA-9: Avisos de plataforma – CRUD para administradores.
 */
@Controller('platform/avisos')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformAvisosController {
  constructor(private readonly avisos: PlatformAvisosService) {}

  @Get()
  async listar(@Query('activo') activo?: string) {
    const activoFilter =
      activo === 'true' ? true : activo === 'false' ? false : undefined;
    return this.avisos.listarTodos(activoFilter);
  }

  @Post()
  async crear(@Body() body: CrearAvisoDto) {
    return this.avisos.crear(body);
  }

  @Patch(':id')
  async actualizar(@Param('id') id: string, @Body() body: ActualizarAvisoDto) {
    return this.avisos.actualizar(id, body);
  }

  @Delete(':id')
  async eliminar(@Param('id') id: string) {
    return this.avisos.eliminar(id);
  }
}
