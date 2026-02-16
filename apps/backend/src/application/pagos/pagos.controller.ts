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
import { PermissionService } from '../../auth/permission.service';
import { RegistrarPagoEfectivoDto } from './dto/registrar-pago-efectivo.dto';
import { RegistrarPagoCartaDto } from './dto/registrar-pago-carta.dto';
import { CrearIntencionPagoDto } from './dto/crear-intencion-pago.dto';

/**
 * Módulo de pagos – efectivo, transferencia y online.
 * Referencia: ROADMAP Fase 5, flujoDePagos.md
 */
@Controller('pagos')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
@Throttle({ default: { limit: 20, ttl: 60_000 } }) // 20 requests/min en endpoints de pago
export class PagosController {
  constructor(
    private readonly pagos: PagosService,
    private readonly permissions: PermissionService,
  ) {}

  /**
   * GET /pagos – Listar pagos de la junta. TESORERA, ADMIN, SECRETARIA.
   */
  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA, RolNombre.ADMIN, RolNombre.SECRETARIA)
  async listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('usuarioId') usuarioId?: string,
    @Query('tipo') tipo?: 'JUNTA' | 'CARTA',
    @Query('fechaDesde') fechaDesde?: string,
    @Query('fechaHasta') fechaHasta?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Request() req?: { user: JwtUser },
  ) {
    const juntaId = req!.user.juntaId!;
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    const filtros: Parameters<PagosService['listar']>[3] = {};
    if (usuarioId?.trim()) filtros.usuarioId = usuarioId.trim();
    if (tipo === 'JUNTA' || tipo === 'CARTA') filtros.tipo = tipo;
    if (fechaDesde?.trim()) filtros.fechaDesde = new Date(fechaDesde.trim());
    if (fechaHasta?.trim()) filtros.fechaHasta = new Date(fechaHasta.trim());
    if (search?.trim()) filtros.search = search.trim();
    const validSortBy = ['fechaPago', 'monto', 'tipo', 'metodo', 'consecutivo'];
    if (sortBy && validSortBy.includes(sortBy)) filtros.sortBy = sortBy as typeof filtros.sortBy;
    if (sortOrder === 'asc' || sortOrder === 'desc') filtros.sortOrder = sortOrder;
    return this.pagos.listar(juntaId, p, l, filtros);
  }

  /**
   * GET /pagos/estadisticas – Ingresos totales, por mes, por año. TESORERA, ADMIN, SECRETARIA.
   */
  @Get('estadisticas')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA, RolNombre.ADMIN, RolNombre.SECRETARIA)
  async estadisticas(
    @Query('anio') anio?: string,
    @Request() req?: { user: JwtUser },
  ) {
    const juntaId = req!.user.juntaId!;
    const a = anio ? parseInt(anio, 10) : undefined;
    return this.pagos.getEstadisticas(juntaId, Number.isNaN(a) ? undefined : a);
  }

  /**
   * POST /pagos – Registrar pago efectivo o transferencia.
   * Solo TESORERA (única que recibe pagos para unificar contabilidad).
   */
  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA)
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
  }

  /**
   * POST /pagos/carta – Registrar pago tipo CARTA (efectivo o transferencia).
   * Monto desde Junta.montoCarta. Solo TESORERA.
   */
  @Post('carta')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA)
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
  }

  /**
   * POST /pagos/carta/online/intencion – Crear intención de pago CARTA online.
   * TESORERA puede crear para otros. CIUDADANO y SECRETARIA solo para sí mismos.
   */
  @Post('carta/online/intencion')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA, RolNombre.CIUDADANO, RolNombre.SECRETARIA)
  async crearIntencionCarta(
    @Body() dto: CrearIntencionPagoDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;

    if (!this.permissions.puedeCrearPagoParaOtro(req.user) && dto.usuarioId !== req.user.id) {
      throw new BadRequestException('Solo puede crear intención para sí mismo');
    }

    const result = await this.pagos.crearIntencionPagoCartaOnline({
      usuarioId: dto.usuarioId,
      juntaId,
      iniciadoPorId: req.user.id,
    });

    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  /**
   * POST /pagos/online/intencion – Crear intención de pago JUNTA online (link Wompi).
   * TESORERA puede crear para cualquier usuario. CIUDADANO y SECRETARIA solo para sí mismos.
   */
  @Post('online/intencion')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA, RolNombre.CIUDADANO, RolNombre.SECRETARIA)
  async crearIntencion(
    @Body() dto: CrearIntencionPagoDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;

    if (!this.permissions.puedeCrearPagoParaOtro(req.user) && dto.usuarioId !== req.user.id) {
      throw new BadRequestException('Solo puede crear intención para su propia deuda');
    }

    const result = await this.pagos.crearIntencionPagoOnline({
      usuarioId: dto.usuarioId,
      juntaId,
      iniciadoPorId: req.user.id,
    });

    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  /**
   * GET /pagos/online/verificar?transaction_id=xxx
   * Rescate al retorno: consulta Wompi y registra si APPROVED.
   * TESORERA, CIUDADANO, SECRETARIA (para verificar su propio pago al retornar).
   */
  @Get('online/verificar')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA, RolNombre.CIUDADANO, RolNombre.SECRETARIA)
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
