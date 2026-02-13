import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaModule } from './prisma/prisma.module';
import { HealthModule } from './health/health.module';
import { AuthModule } from './auth/auth.module';
import { BootstrapModule } from './application/bootstrap/bootstrap.module';
import { PlatformModule } from './platform/platform.module';

@Module({
  imports: [
    PrismaModule,
    HealthModule,
    AuthModule,
    BootstrapModule,
    PlatformModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
