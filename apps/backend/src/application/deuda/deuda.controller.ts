import {
  Controller,
  Get,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DebtService } from '../../domain/services/debt.service';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { PermissionService } from '../../auth/permission.service';

/**
 * Módulo deuda – consulta de deuda calculada bajo demanda.
 * Referencia: ROADMAP Fase 4, calculadoraDeDeuda.md
 *
 * - ADMIN, SECRETARIA, TESORERA: pueden consultar deuda de cualquier usuario de la junta.
 * - AFILIADO: solo puede consultar su propia deuda.
 */
@Controller('usuarios/:usuarioId/deuda')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class DeudaController {
  constructor(
    private readonly debtService: DebtService,
    private readonly permissions: PermissionService,
  ) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.AFILIADO)
  async obtener(
    @Param('usuarioId') usuarioId: string,
    @Query('detalle') detalle?: string,
    @Request() req?: { user: JwtUser },
  ) {
    const user = req!.user;
    const juntaId = user.juntaId!;

    if (!this.permissions.puedeConsultarRecursoDeOtro(user) && usuarioId !== user.id) {
      throw new ForbiddenException('Solo puede consultar su propia deuda');
    }

    const result = await this.debtService.calculateUserDebt({
      usuarioId,
      juntaId,
    });

    const data: { total: number; detalle?: typeof result.detalle } = {
      total: result.total,
    };

    if (detalle === 'true' || detalle === '1') {
      data.detalle = result.detalle;
    }

    return {
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
