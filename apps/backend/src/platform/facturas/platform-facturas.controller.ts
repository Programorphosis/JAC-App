import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { PlatformFacturasService } from './platform-facturas.service';
import { PlatformAdminGuard } from '../../auth/guards/platform-admin.guard';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { EstadoFactura } from '@prisma/client';
import { CrearFacturaDto } from '../dto/crear-factura.dto';
import { RegistrarPagoFacturaDto } from '../dto/registrar-pago-factura.dto';

@Controller('platform/juntas')
@UseGuards(AuthGuard('jwt'), PlatformAdminGuard)
export class PlatformFacturasController {
  constructor(private readonly facturas: PlatformFacturasService) {}

  @Get(':id/facturas')
  async listarFacturas(
    @Param('id') juntaId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('estado') estado?: EstadoFactura,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.facturas.listarFacturas(juntaId, p, l, estado);
  }

  @Post(':id/facturas')
  async crearFactura(
    @Param('id') juntaId: string,
    @Body() body: CrearFacturaDto,
    @Request() req: { user: JwtUser },
  ) {
    return this.facturas.crearFactura(juntaId, body, req.user.id);
  }

  @Get(':id/pagos-plataforma')
  async listarPagosPlataforma(
    @Param('id') juntaId: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
  ) {
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.facturas.listarPagosPlataforma(juntaId, p, l);
  }

  @Post(':id/facturas/:facturaId/pago')
  async registrarPago(
    @Param('id') juntaId: string,
    @Param('facturaId') facturaId: string,
    @Body() body: RegistrarPagoFacturaDto,
    @Request() req: { user: JwtUser },
  ) {
    return this.facturas.registrarPago(
      juntaId,
      { ...body, facturaId },
      req.user.id,
    );
  }

  @Patch(':id/facturas/:facturaId/cancelar')
  async cancelarFactura(
    @Param('id') juntaId: string,
    @Param('facturaId') facturaId: string,
    @Request() req: { user: JwtUser },
  ) {
    return this.facturas.cancelarFactura(juntaId, facturaId, req.user.id);
  }

  @Patch(':id/facturas/:facturaId/reactivar')
  async reactivarFactura(
    @Param('id') juntaId: string,
    @Param('facturaId') facturaId: string,
    @Request() req: { user: JwtUser },
  ) {
    return this.facturas.reactivarFactura(juntaId, facturaId, req.user.id);
  }
}
