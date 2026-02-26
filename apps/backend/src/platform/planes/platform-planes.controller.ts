import { Controller, Get, Post, Patch, Body, Param, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformPlanesService } from './platform-planes.service';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';
import { CrearPlanDto } from '../dto/crear-plan.dto';
import { ActualizarPlanDto } from '../dto/actualizar-plan.dto';

@Controller('platform/planes')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformPlanesController {
  constructor(private readonly planes: PlatformPlanesService) {}

  @Get()
  async listar(@Query('incluirInactivos') incluirInactivos?: string) {
    return this.planes.listar(incluirInactivos === 'true');
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    return this.planes.obtener(id);
  }

  @Post()
  async crear(@Body() body: CrearPlanDto) {
    return this.planes.crear(body);
  }

  @Patch(':id')
  async actualizar(@Param('id') id: string, @Body() body: ActualizarPlanDto) {
    return this.planes.actualizar(id, body);
  }
}
