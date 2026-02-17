import { Controller, Post, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';
import { ImpersonacionSalirGuard } from '../../auth/guards/impersonacion-salir.guard';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { AuthService } from '../../auth/auth.service';

/**
 * PA-8: Impersonación – platform admin puede ver la app como una junta (solo lectura).
 */
@Controller('platform')
export class PlatformImpersonacionController {
  constructor(private readonly auth: AuthService) {}

  @Post('impersonar/:juntaId')
  @UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
  async impersonar(
    @Param('juntaId') juntaId: string,
    @Request() req: { user: JwtUser },
  ) {
    const result = await this.auth.impersonar(req.user.id, juntaId);
    return { data: result };
  }

  @Post('salir-impersonacion')
  @UseGuards(AuthGuard('jwt'), ImpersonacionSalirGuard)
  async salirImpersonacion(@Request() req: { user: JwtUser }) {
    const juntaId = req.user.juntaId;
    if (!juntaId) {
      throw new Error('juntaId esperado en modo impersonación');
    }
    const result = await this.auth.salirImpersonacion(req.user.id, juntaId);
    return { data: result };
  }
}
