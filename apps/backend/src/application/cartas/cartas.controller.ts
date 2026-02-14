/**
 * Módulo de cartas - solicitud y validación.
 * Referencia: flujoSolicitudCarta.md
 */
import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ForbiddenException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { CartasService } from './cartas.service';
import { LetterEmissionRunner } from '../../infrastructure/letter/letter-emission-runner.service';
import {
  RequisitosCartaNoCumplidosError,
  CartaNoPendienteError,
} from '../../domain/errors/domain.errors';
import {
  BadRequestException,
  UnprocessableEntityException,
} from '@nestjs/common';

@Controller('cartas')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class CartasController {
  constructor(
    private readonly cartas: CartasService,
    private readonly letterRunner: LetterEmissionRunner,
  ) {}

  /**
   * GET /cartas - Listar cartas.
   * ?usuarioId=xxx → cartas del usuario. ?estado=PENDIENTE → solo pendientes (ADMIN, SECRETARIA).
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.CIUDADANO)
  async listar(
    @Query('usuarioId') usuarioId: string | undefined,
    @Query('estado') estado: string | undefined,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const user = req.user;

    if (usuarioId?.trim()) {
      const puedeVerOtro =
        user.roles.includes(RolNombre.ADMIN) || user.roles.includes(RolNombre.SECRETARIA);
      if (!puedeVerOtro && usuarioId !== user.id) {
        throw new ForbiddenException('Solo puede listar sus propias cartas');
      }
      const data = await this.cartas.listarPorUsuario(usuarioId.trim(), juntaId);
      return { data, meta: { timestamp: new Date().toISOString() } };
    }

    if (estado === 'PENDIENTE') {
      const puedeVer =
        user.roles.includes(RolNombre.ADMIN) || user.roles.includes(RolNombre.SECRETARIA);
      if (!puedeVer) {
        throw new ForbiddenException('Solo ADMIN o SECRETARIA pueden listar cartas pendientes');
      }
      const data = await this.cartas.listarPendientes(juntaId);
      return { data, meta: { timestamp: new Date().toISOString() } };
    }

    throw new BadRequestException('Se requiere usuarioId o estado=PENDIENTE');
  }

  /**
   * POST /cartas/solicitar - Crear carta en estado PENDIENTE.
   * CIUDADANO: solo para sí mismo. ADMIN, SECRETARIA: para cualquier usuario de la junta.
   */
  @Post('solicitar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.CIUDADANO)
  async solicitar(
    @Body('usuarioId') usuarioId: string,
    @Request() req: { user: JwtUser },
  ) {
    if (!usuarioId?.trim()) {
      throw new BadRequestException('usuarioId es requerido');
    }

    const user = req.user;
    const juntaId = user.juntaId!;

    const puedeSolicitarParaOtro =
      user.roles.includes(RolNombre.ADMIN) || user.roles.includes(RolNombre.SECRETARIA);

    if (!puedeSolicitarParaOtro && usuarioId !== user.id) {
      throw new ForbiddenException('Solo puede solicitar carta para sí mismo');
    }

    try {
      const data = await this.cartas.solicitar(usuarioId.trim(), juntaId);
      return {
        data,
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (err) {
      if (err instanceof Error) {
        if (err.message.includes('Ya existe')) {
          throw new UnprocessableEntityException(err.message);
        }
        if (err.message.includes('no encontrado')) {
          throw new BadRequestException(err.message);
        }
      }
      throw err;
    }
  }

  /**
   * POST /cartas/:id/validar - Validar y aprobar carta.
   * Solo SECRETARIA, ADMIN.
   */
  @Post(':id/validar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async validar(
    @Param('id') cartaId: string,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;

    try {
      const result = await this.letterRunner.emitLetter({
        cartaId,
        juntaId,
        emitidaPorId: req.user.id,
      });

      return {
        data: result,
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (err) {
      if (err instanceof RequisitosCartaNoCumplidosError) {
        throw new UnprocessableEntityException(err.message);
      }
      if (err instanceof CartaNoPendienteError) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }
}
