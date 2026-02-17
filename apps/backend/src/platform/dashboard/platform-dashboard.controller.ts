import { Controller, Get, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformDashboardService } from './platform-dashboard.service';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';

@Controller('platform/dashboard')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformDashboardController {
  constructor(private readonly dashboard: PlatformDashboardService) {}

  @Get()
  async obtener() {
    return this.dashboard.obtener();
  }
}
