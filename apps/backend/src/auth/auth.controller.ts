import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { RefreshTokenDto } from './dto/refresh-token.dto';
import { CambiarPasswordDto } from './dto/cambiar-password.dto';
import {
  OlvideContrasenaDto,
  VerificarCodigoRecuperacionDto,
} from './dto/olvide-contrasena.dto';
import { SolicitarVerificacionEmailDto } from './dto/solicitar-verificacion-email.dto';
import { JwtUser } from './strategies/jwt.strategy';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Get('me')
  @UseGuards(AuthGuard('jwt'))
  async me(@Request() req: { user: JwtUser }) {
    const usuario = await this.auth.getProfile(req.user.id);
    return { data: usuario };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } }) // 5 intentos por minuto (fuerza bruta)
  async login(@Body() body: LoginDto) {
    const result = await this.auth.login(body);
    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 10, ttl: 60_000 } })
  async refresh(@Body() body: RefreshTokenDto) {
    const result = await this.auth.validateRefreshToken(body.refreshToken);
    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('solicitar-verificacion-email')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  @Throttle({ default: { limit: 3, ttl: 60_000 } })
  async solicitarVerificacionEmail(
    @Request() req: { user: JwtUser },
    @Body() body: SolicitarVerificacionEmailDto,
  ) {
    const result = await this.auth.solicitarCodigoVerificacionEmail(
      req.user.id,
      body,
    );
    return { data: result };
  }

  @Patch('cambiar-password')
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard('jwt'))
  async cambiarPassword(
    @Request() req: { user: JwtUser },
    @Body() body: CambiarPasswordDto,
  ) {
    const result = await this.auth.cambiarPassword(req.user.id, body);
    return { data: result };
  }

  @Post('olvide-contrasena')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 3, ttl: 60_000 } }) // 3 por minuto (evitar abuso)
  async olvideContrasena(@Body() body: OlvideContrasenaDto) {
    const result = await this.auth.solicitarCodigoRecuperacion(body);
    return { data: result };
  }

  @Post('olvide-contrasena/verificar')
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 5, ttl: 60_000 } })
  async verificarCodigoRecuperacion(
    @Body() body: VerificarCodigoRecuperacionDto,
  ) {
    await this.auth.verificarCodigoYRecuperar(body);
    return { data: { ok: true } };
  }
}
