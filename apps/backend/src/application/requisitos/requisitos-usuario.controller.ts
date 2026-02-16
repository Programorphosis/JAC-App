import {
  Controller,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequisitosService } from './requisitos.service';
import { UpdateEstadoRequisitoDto } from './dto/update-estado-requisito.dto';
import { UpdateObligacionRequisitoDto } from './dto/update-obligacion-requisito.dto';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { ModificadorSoloGuard } from '../../auth/guards/modificador-solo.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../../auth/strategies/jwt.strategy';

@Controller('usuarios/:usuarioId/requisitos')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class RequisitosUsuarioController {
  constructor(private readonly requisitos: RequisitosService) {}

  @Post(':requisitoTipoId/estado')
  @UseGuards(ModificadorSoloGuard)
  async actualizarEstado(
    @Param('usuarioId') usuarioId: string,
    @Param('requisitoTipoId') requisitoTipoId: string,
    @Body() dto: UpdateEstadoRequisitoDto,
    @Request() req: { user: JwtUser },
  ) {
    return this.requisitos.actualizarEstado(
      usuarioId,
      requisitoTipoId,
      dto.estado,
      req.user,
    );
  }

  @Patch(':requisitoTipoId/obligacion')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN)
  async actualizarObligacion(
    @Param('usuarioId') usuarioId: string,
    @Param('requisitoTipoId') requisitoTipoId: string,
    @Body() dto: UpdateObligacionRequisitoDto,
    @Request() req: { user: JwtUser },
  ) {
    return this.requisitos.actualizarObligacion(
      usuarioId,
      requisitoTipoId,
      dto.obligacionActiva,
      req.user,
    );
  }
}
