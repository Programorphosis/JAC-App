import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { PagosModule } from '../pagos/pagos.module';

@Module({
  imports: [PagosModule],
  controllers: [WebhooksController],
})
export class WebhooksModule {}
