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
import { UsersService } from './users.service';
import { CreateUserDto } from './dto/create-user.dto';
import { UpdateUserDto } from './dto/update-user.dto';
import { JuntaGuard } from '../../auth/guards/junta.guard';
import { RolesGuard } from '../../auth/guards/roles.guard';
import { RolNombre } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtUser } from '../../auth/strategies/jwt.strategy';

@Controller('usuarios')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Request() req?: { user: JwtUser },
  ) {
    const juntaId = req!.user.juntaId!;
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    return this.users.listar(juntaId, p, l);
  }

  @Get(':id')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async obtener(
    @Param('id') id: string,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.users.obtener(id, juntaId);
  }

  @Post()
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async crear(
    @Body() dto: CreateUserDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.users.crear(dto, juntaId, req.user.id);
  }

  @Patch(':id')
  @UseGuards(RolesGuard)
  @Roles(RolNombre.ADMIN, RolNombre.SECRETARIA)
  async actualizar(
    @Param('id') id: string,
    @Body() dto: UpdateUserDto,
    @Request() req: { user: JwtUser },
  ) {
    const juntaId = req.user.juntaId!;
    return this.users.actualizar(id, dto, juntaId, req.user.id);
  }
}
