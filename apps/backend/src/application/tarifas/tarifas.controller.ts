import {
  Controller,
  Get,
  Post,
  Body,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { TarifasService } from './tarifas.service';
import { CreateTarifaDto } from './dto/create-tarifa.dto';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolNombre } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtUser } from '../../auth/strategies/jwt.strategy';

@Controller('tarifas')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class TarifasController {
  constructor(private readonly tarifas: TarifasService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA, RolNombre.TESORERA)
  async listar(
    @Query('estadoLaboral') estadoLaboral?: 'TRABAJANDO' | 'NO_TRABAJANDO',
    @Request() req?: { user: JwtUser },
  ) {
    const juntaId = req!.user.juntaId!;
    return this.tarifas.listar(juntaId, estadoLaboral);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async crear(
    @Body() dto: CreateTarifaDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.tarifas.crear(dto, juntaId, req.user.id);
  }
}
