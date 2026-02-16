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
import { PermissionService } from '../../auth/permission.service';
import { CartasService } from './cartas.service';
import { LetterEmissionRunner } from '../../infrastructure/letter/letter-emission-runner.service';
import { BadRequestException } from '@nestjs/common';

@Controller('cartas')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class CartasController {
  constructor(
    private readonly cartas: CartasService,
    private readonly letterRunner: LetterEmissionRunner,
    private readonly permissions: PermissionService,
  ) {}

  /**
   * GET /cartas - Listar cartas.
   * ?usuarioId=xxx → cartas del usuario. ?estado=PENDIENTE → solo pendientes (SECRETARIA).
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.AFILIADO)
  async listar(
    @Query('usuarioId') usuarioId: string | undefined,
    @Query('estado') estado: string | undefined,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const user = req.user;

    if (usuarioId?.trim()) {
      if (!this.permissions.puedeVerCartasDeOtro(user) && usuarioId !== user.id) {
        throw new ForbiddenException('Solo puede listar sus propias cartas');
      }
      const data = await this.cartas.listarPorUsuario(usuarioId.trim(), juntaId);
      return { data, meta: { timestamp: new Date().toISOString() } };
    }

    if (estado === 'PENDIENTE') {
      if (!this.permissions.puedeListarCartasPendientes(user)) {
        throw new ForbiddenException('Solo SECRETARIA puede listar cartas pendientes');
      }
      const data = await this.cartas.listarPendientes(juntaId);
      return { data, meta: { timestamp: new Date().toISOString() } };
    }

    throw new BadRequestException('Se requiere usuarioId o estado=PENDIENTE');
  }

  /**
   * POST /cartas/solicitar - Crear carta en estado PENDIENTE.
   * AFILIADO: solo para sí mismo. SECRETARIA: para cualquier usuario de la junta.
   */
  @Post('solicitar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA, RolNombre.AFILIADO)
  async solicitar(
    @Body('usuarioId') usuarioId: string,
    @Request() req: { user: JwtUser },
  ) {
    if (!usuarioId?.trim()) {
      throw new BadRequestException('usuarioId es requerido');
    }

    const user = req.user;
    const juntaId = user.juntaId!;

    if (!this.permissions.puedeSolicitarCartaParaOtro(user) && usuarioId !== user.id) {
      throw new ForbiddenException('Solo puede solicitar carta para sí mismo');
    }

    const data = await this.cartas.solicitar(usuarioId.trim(), juntaId);
    return {
      data,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  /**
   * GET /cartas/:id/descargar - Obtener URL firmada para descargar PDF.
   * AFILIADO: solo propias. SECRETARIA: cualquiera de la junta.
   */
  @Get(':id/descargar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA, RolNombre.AFILIADO)
  async descargar(
    @Param('id') cartaId: string,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const user = req.user;

    const soloPropios = this.permissions.puedeVerCartasDeOtro(user) ? undefined : user.id;

    const url = await this.cartas.getUrlDescargaCarta(cartaId, juntaId, soloPropios);
    return { data: { url } };
  }

  /**
   * POST /cartas/:id/validar - Validar y aprobar carta.
   * Solo SECRETARIA.
   */
  @Post(':id/validar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA)
  async validar(
    @Param('id') cartaId: string,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;

    const result = await this.letterRunner.emitLetter({
      cartaId,
      juntaId,
      emitidaPorId: req.user.id,
    });

    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
