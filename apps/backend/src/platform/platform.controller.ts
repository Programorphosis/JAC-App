import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformService } from './platform.service';
import { PlatformAdminGuard } from '../auth/guards/platform-admin.guard';
import { JwtUser } from '../auth/strategies/jwt.strategy';
import { CreateJuntaAdminUser } from '../application/junta/junta.service';

@Controller('platform/juntas')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformController {
  constructor(private readonly platform: PlatformService) {}

  @Get()
  async listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.platform.listarJuntas(p, l);
  }

  @Get(':id')
  async obtener(@Param('id') id: string) {
    return this.platform.obtenerJunta(id);
  }

  @Post()
  async crear(
    @Body()
    body: {
      nombre: string;
      nit?: string;
      montoCarta?: number;
      adminUser: CreateJuntaAdminUser;
    },
    @Request() req: { user: JwtUser },
  ) {
    return this.platform.crearJunta(body, req.user.id);
  }

  @Patch(':id')
  async actualizar(
    @Param('id') id: string,
    @Body() body: { nombre?: string; nit?: string; montoCarta?: number },
    @Request() req: { user: JwtUser },
  ) {
    return this.platform.actualizarJunta(id, body, req.user.id);
  }
}
