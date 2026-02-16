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
import { ModificadorOAdminGuard } from '../../auth/guards/modificador-o-admin.guard';
import { UsuarioPropioOAdminGuard } from '../../auth/guards/usuario-propio-o-admin.guard';
import { RolNombre } from '@prisma/client';
import { Roles } from '../../auth/decorators/roles.decorator';
import { JwtUser } from '../../auth/strategies/jwt.strategy';

@Controller('usuarios')
@UseGuards(AuthGuard('jwt'), JuntaGuard)
export class UsersController {
  constructor(private readonly users: UsersService) {}

  @Get()
  @UseGuards(ModificadorOAdminGuard)
  async listar(
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('activo') activo?: string,
    @Query('rol') rol?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: string,
    @Request() req?: { user: JwtUser },
  ) {
    const juntaId = req!.user.juntaId!;
    const p = page ? parseInt(page, 10) : 1;
    const l = limit ? parseInt(limit, 10) : 20;
    const opts: Parameters<UsersService['listar']>[3] = {};
    if (search?.trim()) opts.search = search.trim();
    if (activo === 'true') opts.activo = true;
    if (activo === 'false') opts.activo = false;
    if (rol?.trim()) opts.rol = rol.trim();
    const validSortBy = ['apellidos', 'nombres', 'numeroDocumento', 'fechaCreacion'];
    if (sortBy && validSortBy.includes(sortBy)) opts.sortBy = sortBy as typeof opts.sortBy;
    if (sortOrder === 'asc' || sortOrder === 'desc') opts.sortOrder = sortOrder;
    return this.users.listar(juntaId, p, l, opts);
  }

  @Get(':id')
  @UseGuards(UsuarioPropioOAdminGuard)
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
