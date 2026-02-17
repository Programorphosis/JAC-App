import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformAuditoriaService } from './platform-auditoria.service';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';

@Controller('platform/auditoria')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformAuditoriaController {
  constructor(private readonly auditoria: PlatformAuditoriaService) {}

  @Get()
  async listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 50;
    return this.auditoria.listar(p, l);
  }
}
