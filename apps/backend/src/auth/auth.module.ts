import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { PrismaModule } from '../prisma/prisma.module';
import { AuditModule } from '../infrastructure/audit/audit.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { PermissionService } from './permission.service';
import { JwtStrategy } from './strategies/jwt.strategy';
import { RolesGuard } from './guards/roles.guard';

@Module({
  imports: [
    PrismaModule,
    AuditModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.register({
      secret: process.env.JWT_SECRET,
      signOptions: { expiresIn: 900 },
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, PermissionService, JwtStrategy, RolesGuard],
  exports: [AuthService, PermissionService, JwtModule, RolesGuard],
})
export class AuthModule {}
