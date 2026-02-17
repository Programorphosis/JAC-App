import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PagosModule } from '../pagos/pagos.module';
import { PlatformModule } from '../../platform/platform.module';
import { PrismaModule } from '../../prisma/prisma.module';

@Module({
  imports: [PagosModule, PlatformModule, PrismaModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
