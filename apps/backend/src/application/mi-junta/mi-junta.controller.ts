import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  UseGuards,
  Request,
  UseInterceptors,
  UploadedFile,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import { AuthGuard } from '@nestjs/passport';
import { JwtUser } from '../../auth/strategies/jwt.strategy';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { MiJuntaService } from './mi-junta.service';
import { ActualizarWompiJuntaDto } from '../../platform/dto/actualizar-wompi-junta.dto';
import { CrearSuscripcionMiJuntaDto } from './dto/crear-suscripcion-mi-junta.dto';
import { ActualizarSuscripcionMiJuntaDto } from './dto/actualizar-suscripcion-mi-junta.dto';
import { ActualizarDatosJuntaDto } from './dto/actualizar-datos-junta.dto';
import { CancelarSuscripcionDto } from './dto/cancelar-suscripcion.dto';
import type { MulterFile } from '../documentos/types';

/**
 * Información de la junta del usuario autenticado.
 * GET /api/mi-junta – datos de la junta (solo lectura).
 * PATCH /api/mi-junta/wompi – configurar Wompi (solo ADMIN).
 * GET /api/mi-junta/planes – planes disponibles (solo TESORERA).
 * POST /api/mi-junta/suscripcion – crear suscripción (solo TESORERA).
 * PATCH /api/mi-junta/suscripcion – actualizar plan/overrides (solo TESORERA).
 * Requiere juntaId en JWT (usuarios de junta, no platform admin sin impersonar).
 */
@Controller('mi-junta')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class MiJuntaController {
  constructor(private readonly miJunta: MiJuntaService) {}

  @Get()
  async obtener(@Request() req: { user: JwtUser }) {
    const juntaId = req.user.juntaId!;
    return this.miJunta.obtener(juntaId);
  }

  @Get('consumo')
  async consumo(@Request() req: { user: JwtUser }) {
    const juntaId = req.user.juntaId!;
    return this.miJunta.consumo(juntaId);
  }

  /** POST /api/mi-junta/escudo – Sube escudo municipal (PNG). Solo ADMIN. */
  @Post('escudo')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN)
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 2 * 1024 * 1024 },
    }),
  )
  async subirEscudo(
    @UploadedFile() file: MulterFile | undefined,
    @Request() req: { user: JwtUser },
  ) {
    if (!file) {
      throw new BadRequestException('El archivo es requerido');
    }
    const juntaId = req.user.juntaId!;
    return this.miJunta.subirEscudo(
      juntaId,
      {
        buffer: file.buffer,
        mimetype: file.mimetype,
        size: file.size,
      },
      req.user.id,
    );
  }

  /** PATCH /api/mi-junta/datos – Actualiza datos de contacto de la junta. Solo ADMIN. */
  @Patch('datos')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN)
  async actualizarDatos(
    @Body() body: ActualizarDatosJuntaDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.miJunta.actualizarDatos(juntaId, body, req.user.id);
  }

  @Patch('wompi')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN)
  async actualizarWompi(
    @Body() body: ActualizarWompiJuntaDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.miJunta.actualizarWompi(juntaId, body, req.user.id);
  }

  @Get('planes')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA)
  async listarPlanes() {
    return this.miJunta.listarPlanes();
  }

  @Post('suscripcion')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA)
  async crearSuscripcion(
    @Body() body: CrearSuscripcionMiJuntaDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.miJunta.crearSuscripcion(
      juntaId,
      body.planId,
      body.diasPrueba,
      body.periodo,
      req.user.id,
    );
  }

  @Patch('suscripcion')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.TESORERA)
  async actualizarSuscripcion(
    @Body() body: ActualizarSuscripcionMiJuntaDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.miJunta.actualizarSuscripcion(juntaId, body, req.user.id);
  }

  /** DELETE /api/mi-junta/suscripcion – Cancela la suscripción activa. Solo ADMIN. */
  @Delete('suscripcion')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN)
  async cancelarSuscripcion(
    @Body() body: CancelarSuscripcionDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.miJunta.cancelarSuscripcion(juntaId, body.motivo, req.user.id);
  }
}
