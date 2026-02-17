import { Module } from '@nestjs/common';
import { LimitesService } from './limites.service';

@Module({
  providers: [LimitesService],
  exports: [LimitesService],
})
export class LimitesModule {}
