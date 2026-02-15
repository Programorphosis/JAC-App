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
import {
  UsuarioNoEncontradoError,
  SinHistorialLaboralError,
  SinTarifaVigenteError,
  HistorialLaboralSuperpuestoError,
} from '../../domain/errors/domain.errors';
import { NotFoundException, UnprocessableEntityException } from '@nestjs/common';

/**
 * Módulo deuda – consulta de deuda calculada bajo demanda.
 * Referencia: ROADMAP Fase 4, calculadoraDeDeuda.md
 *
 * - ADMIN, SECRETARIA, TESORERA: pueden consultar deuda de cualquier usuario de la junta.
 * - CIUDADANO: solo puede consultar su propia deuda.
 */
@Controller('usuarios/:usuarioId/deuda')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class DeudaController {
  constructor(private readonly debtService: DebtService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.CIUDADANO)
  async obtener(
    @Param('usuarioId') usuarioId: string,
    @Query('detalle') detalle?: string,
    @Request() req?: { user: JwtUser },
  ) {
    const user = req!.user;
    const juntaId = user.juntaId!;

    const puedeConsultarOtro =
      user.roles.includes(RolNombre.ADMIN) ||
      user.roles.includes(RolNombre.SECRETARIA) ||
      user.roles.includes(RolNombre.TESORERA) ||
      (user.esModificador && !!user.juntaId);

    if (!puedeConsultarOtro && usuarioId !== user.id) {
      throw new ForbiddenException('Solo puede consultar su propia deuda');
    }

    try {
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
    } catch (err) {
      if (err instanceof UsuarioNoEncontradoError) {
        throw new NotFoundException(err.message);
      }
      if (
        err instanceof SinHistorialLaboralError ||
        err instanceof SinTarifaVigenteError ||
        err instanceof HistorialLaboralSuperpuestoError
      ) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }
}
