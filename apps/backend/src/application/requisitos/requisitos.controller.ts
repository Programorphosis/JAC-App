import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { RequisitosService } from './requisitos.service';
import { UpdateEstadoRequisitoDto } from './dto/update-estado-requisito.dto';
import { UpdateObligacionRequisitoDto } from './dto/update-obligacion-requisito.dto';
import { CreateRequisitoTipoDto } from './dto/create-requisito-tipo.dto';
import { UpdateRequisitoTipoDto } from './dto/update-requisito-tipo.dto';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { Roles } from '../../auth/decorators/roles.decorator';
import { RolNombre } from '@prisma/client';
import { JwtUser } from '../../auth/strategies/jwt.strategy';

@Controller('requisitos')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class RequisitosController {
  constructor(private readonly requisitos: RequisitosService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN)
  async listar(@Request() req: { user: JwtUser }) {
    const juntaId = req.user.juntaId!;
    const data = await this.requisitos.listarRequisitos(juntaId);
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN)
  async crear(
    @Body() dto: CreateRequisitoTipoDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const data = await this.requisitos.crearRequisitoTipo(
      dto,
      juntaId,
      req.user.id,
    );
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateRequisitoTipoDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const data = await this.requisitos.actualizarRequisitoTipo(
      id,
      dto,
      juntaId,
      req.user.id,
    );
    return { data, meta: { timestamp: new Date().toISOString() } };
  }

  @Delete(':id')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN)
  async eliminar(
    @Param('id') id: string,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    const data = await this.requisitos.eliminarRequisitoTipo(
      id,
      juntaId,
      req.user.id,
    );
    return { data, meta: { timestamp: new Date().toISOString() } };
  }
}
