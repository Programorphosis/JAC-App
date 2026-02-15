import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  UseGuards,
  Request,
  BadRequestException,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { PagosService } from './pagos.service';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { RegistrarPagoEfectivoDto } from './dto/registrar-pago-efectivo.dto';
import { RegistrarPagoCartaDto } from './dto/registrar-pago-carta.dto';
import { CrearIntencionPagoDto } from './dto/crear-intencion-pago.dto';
import {
  DeudaCeroError,
  PagoDuplicadoError,
  PagoCartaPendienteError,
  UsuarioNoEncontradoError,
} from '../../domain/errors/domain.errors';
import {
  ConflictException,
  UnprocessableEntityException,
  NotFoundException,
} from '@nestjs/common';

/**
 * Módulo de pagos – efectivo, transferencia y online.
 * Referencia: ROADMAP Fase 5, flujoDePagos.md
 */
@Controller('pagos')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } }) // 20 requests/min en endpoints de pago
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  /**
   * POST /pagos – Registrar pago efectivo o transferencia.
   * Solo TESORERA, SECRETARIA. El monto se calcula en backend.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA, RolNombre.SECRETARIA)
  @HttpCode(HttpStatus.CREATED)
  async registrarEfectivo(
    @Body() dto: RegistrarPagoEfectivoDto,
    @Request() req: { user: JwtUser },
  ) {
    if (dto.metodo === 'TRANSFERENCIA' && !dto.referenciaExterna?.trim()) {
      throw new BadRequestException(
        'referenciaExterna es obligatoria para pagos por transferencia',
      );
    }

    try {
      const juntaId = req.user.juntaId!;
      const result = await this.pagos.registrarPagoEfectivo({
        usuarioId: dto.usuarioId,
        juntaId,
        metodo: dto.metodo,
        registradoPorId: req.user.id,
        referenciaExterna: dto.referenciaExterna?.trim() || undefined,
      });

      return {
        data: result,
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (err) {
      if (err instanceof DeudaCeroError) {
        throw new UnprocessableEntityException(err.message);
      }
      if (err instanceof PagoDuplicadoError) {
        throw new ConflictException(err.message);
      }
      if (err instanceof UsuarioNoEncontradoError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  /**
   * POST /pagos/carta – Registrar pago tipo CARTA (efectivo o transferencia).
   * Monto desde Junta.montoCarta. Solo TESORERA, SECRETARIA.
   */
  @Post('carta')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA, RolNombre.SECRETARIA)
  @HttpCode(HttpStatus.CREATED)
  async registrarCarta(
    @Body() dto: RegistrarPagoCartaDto,
    @Request() req: { user: JwtUser },
  ) {
    if (dto.metodo === 'TRANSFERENCIA' && !dto.referenciaExterna?.trim()) {
      throw new BadRequestException(
        'referenciaExterna es obligatoria para pagos por transferencia',
      );
    }

    try {
      const juntaId = req.user.juntaId!;
      const result = await this.pagos.registrarPagoCarta({
        usuarioId: dto.usuarioId,
        juntaId,
        metodo: dto.metodo,
        registradoPorId: req.user.id,
        referenciaExterna: dto.referenciaExterna?.trim() || undefined,
      });

      return {
        data: result,
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (err) {
      if (err instanceof UsuarioNoEncontradoError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof PagoCartaPendienteError) {
        throw new UnprocessableEntityException(err.message);
      }
      if (
        err instanceof Error &&
        err.message.includes('Tiene una carta vigente')
      ) {
        throw new UnprocessableEntityException(err.message);
      }
      if (
        err instanceof Error &&
        err.message.includes('monto de carta configurado')
      ) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }

  /**
   * POST /pagos/carta/online/intencion – Crear intención de pago CARTA online.
   * Monto desde Junta.montoCarta. SECRETARIA, TESORERA, CIUDADANO.
   */
  @Post('carta/online/intencion')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.CIUDADANO)
  async crearIntencionCarta(
    @Body() dto: CrearIntencionPagoDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const puedeCrearParaOtro =
      req.user.roles.includes(RolNombre.SECRETARIA) ||
      req.user.roles.includes(RolNombre.TESORERA);

    if (!puedeCrearParaOtro && dto.usuarioId !== req.user.id) {
      throw new BadRequestException('Solo puede crear intención para sí mismo');
    }

    try {
      const result = await this.pagos.crearIntencionPagoCartaOnline({
        usuarioId: dto.usuarioId,
        juntaId,
        iniciadoPorId: req.user.id,
      });

      return {
        data: result,
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (err) {
      if (err instanceof UsuarioNoEncontradoError) {
        throw new NotFoundException(err.message);
      }
      if (err instanceof PagoCartaPendienteError) {
        throw new UnprocessableEntityException(err.message);
      }
      if (
        err instanceof Error &&
        err.message.includes('Tiene una carta vigente')
      ) {
        throw new UnprocessableEntityException(err.message);
      }
      if (
        err instanceof Error &&
        err.message.includes('monto de carta configurado')
      ) {
        throw new UnprocessableEntityException(err.message);
      }
      throw err;
    }
  }

  /**
   * POST /pagos/online/intencion – Crear intención de pago JUNTA online (link Wompi).
   * SECRETARIA, TESORERA pueden crear para cualquier usuario.
   * CIUDADANO solo para sí mismo.
   */
  @Post('online/intencion')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.CIUDADANO)
  async crearIntencion(
    @Body() dto: CrearIntencionPagoDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const puedeCrearParaOtro =
      req.user.roles.includes(RolNombre.SECRETARIA) ||
      req.user.roles.includes(RolNombre.TESORERA);

    if (!puedeCrearParaOtro && dto.usuarioId !== req.user.id) {
      throw new BadRequestException('Solo puede crear intención para su propia deuda');
    }

    try {
      const result = await this.pagos.crearIntencionPagoOnline({
        usuarioId: dto.usuarioId,
        juntaId,
        iniciadoPorId: req.user.id,
      });

      return {
        data: result,
        meta: { timestamp: new Date().toISOString() },
      };
    } catch (err) {
      if (err instanceof DeudaCeroError) {
        throw new UnprocessableEntityException(err.message);
      }
      if (err instanceof UsuarioNoEncontradoError) {
        throw new NotFoundException(err.message);
      }
      throw err;
    }
  }

  /**
   * GET /pagos/online/verificar?transaction_id=xxx
   * Rescate al retorno: consulta Wompi y registra si APPROVED.
   */
  @Get('online/verificar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.CIUDADANO)
  async verificarPagoOnline(@Query('transaction_id') transactionId: string) {
    if (!transactionId?.trim()) {
      throw new BadRequestException('transaction_id es requerido');
    }

    const result = await this.pagos.consultarYRegistrarSiAprobado(transactionId);
    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
