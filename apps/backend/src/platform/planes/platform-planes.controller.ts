import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformPlanesService } from './platform-planes.service';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';

@Controller('platform/planes')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformPlanesController {
  constructor(private readonly planes: PlatformPlanesService) {}

  @Get()
  async listar() {
    return this.planes.listar();
  }
}
