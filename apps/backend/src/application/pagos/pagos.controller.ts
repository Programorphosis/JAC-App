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
import { AuthGuard } from '@nestjs/passport';
import { PagosService } from './pagos.service';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { RegistrarPagoEfectivoDto } from './dto/registrar-pago-efectivo.dto';
import { CrearIntencionPagoDto } from './dto/crear-intencion-pago.dto';
import {
  DeudaCeroError,
  PagoDuplicadoError,
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
export class PagosController {
  constructor(private readonly pagos: PagosService) {}

  /**
   * POST /pagos – Registrar pago efectivo o transferencia.
   * Solo TESORERA, ADMIN, SECRETARIA. El monto se calcula en backend.
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA, RolNombre.ADMIN, RolNombre.SECRETARIA)
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
   * POST /pagos/online/intencion – Crear intención de pago online (link Wompi).
   * ADMIN, SECRETARIA, TESORERA pueden crear para cualquier usuario.
   * CIUDADANO solo para sí mismo.
   */
  @Post('online/intencion')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.CIUDADANO)
  async crearIntencion(
    @Body() dto: CrearIntencionPagoDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const puedeCrearParaOtro =
      req.user.roles.includes(RolNombre.ADMIN) ||
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
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA, RolNombre.CIUDADANO)
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
