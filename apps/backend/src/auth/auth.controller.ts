import {
  Controller,
  Get,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  BadRequestException,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service';
import { LoginDto } from './dto/login.dto';
import { JwtUser } from './strategies/jwt.strategy';

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
  async login(@Body() body: LoginDto) {
    const result = await this.auth.login(body);
    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }

  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  async refresh(@Body() body: { refreshToken: string }) {
    if (!body.refreshToken) {
      throw new BadRequestException('refreshToken requerido');
    }
    const result = await this.auth.validateRefreshToken(body.refreshToken);
    return {
      data: result,
      meta: { timestamp: new Date().toISOString() },
    };
  }
}
