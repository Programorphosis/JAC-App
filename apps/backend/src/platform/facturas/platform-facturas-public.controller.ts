import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Req,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Request } from 'express';
import { RolNombre } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { PlatformFacturasService } from './platform-facturas.service';
import { EstadoFactura } from '@prisma/client';
import { CrearIntencionPagoFacturaDto } from '../dto/crear-intencion-pago-factura.dto';

/**
 * Facturas de la plataforma vistas por la junta (admin, tesorera, secretaria).
 * GET /api/facturas-plataforma – lista facturas.
 * POST /api/facturas-plataforma/intencion – crear intención pago online.
 * GET /api/facturas-plataforma/verificar – verificar pago tras retorno.
 */
@Controller('facturas-plataforma')
@UseGuards(AuthGuard('jwt'), RolesGuard)
@Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA)
export class PlatformFacturasPublicController {
  constructor(private readonly facturas: PlatformFacturasService) {}

  @Post('intencion')
  @Roles(RolNombre.TESORERA)
  async crearIntencionPago(
    @Req() req: Request,
    @Body() dto: CrearIntencionPagoFacturaDto,
  ) {
    const user = req.user as JwtUser;
    if (!user.juntaId) {
      throw new BadRequestException('Usuario sin junta asociada');
    }
    return this.facturas.crearIntencionPagoFactura(
      dto.facturaId,
      user.juntaId,
      user.id,
    );
  }

  @Get('verificar')
  @Roles(RolNombre.TESORERA)
  async verificarPago(
    @Req() req: Request,
    @Query('factura_id') facturaId: string,
    @Query('transaction_id') transactionId: string,
  ) {
    const user = req.user as JwtUser;
    if (!user.juntaId || !facturaId || !transactionId) {
      return {
        registrado: false,
        codigo: 'PARAMETROS_INVALIDOS',
        mensaje: 'Se requieren factura_id y transaction_id',
      };
    }
    return this.facturas.consultarYRegistrarPagoFactura(
      transactionId,
      facturaId,
      user.juntaId,
    );
  }

  @Get()
  async listarFacturas(
    @Req() req: Request,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: EstadoFactura,
  ) {
    const user = req.user as JwtUser;
    if (!user.juntaId) {
      return { data: [], meta: { page: 1, limit: 20, total: 0, totalPages: 0 } };
    }
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.facturas.listarFacturas(user.juntaId, p, l, estado);
  }

  @Get('pendientes')
  async listarPendientes(@Req() req: Request) {
    const user = req.user as JwtUser;
    if (!user.juntaId) {
      return { data: [] };
    }
    return this.facturas.listarFacturasPendientes(user.juntaId);
  }
}
