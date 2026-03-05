import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  Res,
} from '@nestjs/common';
import { Response } from 'express';
import { AuthGuard } from '@nestjs/passport';
import { PlatformOperacionesService } from './platform-operaciones.service';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { CrearNotaDto } from '../dto/crear-nota.dto';

@Controller('platform/juntas')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformOperacionesController {
  constructor(private readonly operaciones: PlatformOperacionesService) {}

  @Get(':id/notas')
  async listarNotas(
    @Param('id') juntaId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 50;
    return this.operaciones.listarNotas(juntaId, p, l);
  }

  @Post(':id/notas')
  async crearNota(
    @Param('id') juntaId: string,
    @Body() body: CrearNotaDto,
    @Request() req: { user: JwtUser },
  ) {
    return this.operaciones.crearNota(juntaId, body.contenido, req.user.id);
  }

  @Get(':id/exportar')
  async exportar(
    @Param('id') juntaId: string,
    @Res() res: Response,
    @Query('format') format?: string,
  ) {
    const fmt = format === 'csv' ? 'csv' : 'json';
    const result = await this.operaciones.exportar(juntaId, fmt);

    if (fmt === 'csv') {
      const { data, filename } = result as { data: string; filename: string };
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader(
        'Content-Disposition',
        `attachment; filename="${filename}"`,
      );
      return res.send(data);
    }

    return res.json(result);
  }
}
