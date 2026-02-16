import { Controller, Get, Query, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { AuditoriasService } from './auditorias.service';

/**
 * Auditorías – ADMIN, SECRETARIA, TESORERA.
 * Lista eventos de auditoría de la junta. TESORERA suele filtrar por entidad Pago.
 */
@Controller('auditorias')
@UseGuards(AuthGuard('jwt'), JuntaGuard, RolesGuard)
@Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA)
export class AuditoriasController {
  constructor(private readonly auditorias: AuditoriasService) {}

  @Get()
  async listar(
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
    @Query('entidad') entidad?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Request() req?: { user: JwtUser },
  ) {
    const juntaId = req!.user.juntaId!;
    const opts: Parameters<AuditoriasService['listarPorJunta']>[1] = {
      limit: limit ? parseInt(limit, 10) : undefined,
      offset: offset ? parseInt(offset, 10) : undefined,
      entidad: entidad?.trim() || undefined,
      search: search?.trim() || undefined,
    };
    const validSortBy = ['fecha', 'accion', 'entidad'];
    if (sortBy && validSortBy.includes(sortBy)) opts.sortBy = sortBy as typeof opts.sortBy;
    if (sortOrder === 'asc' || sortOrder === 'desc') opts.sortOrder = sortOrder;
    const result = await this.auditorias.listarPorJunta(juntaId, opts);
    return {
      data: result.data,
      meta: { total: result.total, timestamp: new Date().toISOString() },
    };
  }
}
