import {
  Controller,
  Post,
  Body,
  Headers,
  HttpCode,
  HttpStatus,
  BadRequestException,
  ConflictException,
} from '@nestjs/common';
import { BootstrapService } from './bootstrap.service';
import { BootstrapBodyDto } from './dto/bootstrap-body.dto';

@Controller('bootstrap')
export class BootstrapController {
  constructor(private readonly bootstrapService: BootstrapService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async ejecutar(
    @Body() body: BootstrapBodyDto,
    @Headers('x-bootstrap-token') token: string,
  ) {
    const expectedToken = process.env.BOOTSTRAP_TOKEN;
    if (!expectedToken || token !== expectedToken) {
      throw new BadRequestException('Token de bootstrap inválido o no configurado');
    }

    const puede = await this.bootstrapService.puedeEjecutarBootstrap();
    if (!puede) {
      throw new ConflictException('El bootstrap ya fue ejecutado. El sistema tiene juntas registradas.');
    }

    if (!body.platformAdmin || !body.primeraJunta) {
      throw new BadRequestException('Se requieren platformAdmin y primeraJunta');
    }

    if (
      !body.platformAdmin.nombres ||
      !body.platformAdmin.apellidos ||
      !body.platformAdmin.tipoDocumento ||
      !body.platformAdmin.numeroDocumento ||
      !body.platformAdmin.password
    ) {
      throw new BadRequestException('platformAdmin requiere: nombres, apellidos, tipoDocumento, numeroDocumento, password');
    }

    if (
      !body.primeraJunta.nombre ||
      !body.primeraJunta.adminUser?.nombres ||
      !body.primeraJunta.adminUser?.apellidos ||
      !body.primeraJunta.adminUser?.tipoDocumento ||
      !body.primeraJunta.adminUser?.numeroDocumento
    ) {
      throw new BadRequestException(
        'primeraJunta requiere: nombre, adminUser con nombres, apellidos, tipoDocumento, numeroDocumento',
      );
    }

    const result = await this.bootstrapService.ejecutarBootstrap(body);

    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
