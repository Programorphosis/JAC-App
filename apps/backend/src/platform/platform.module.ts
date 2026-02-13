import { Module } from '@nestjs/common';
import { PlatformController } from './platform.controller';
import { PlatformService } from './platform.service';
import { JuntaModule } from '../application/junta/junta.module';
import { AuditModule } from '../infrastructure/audit/audit.module';

@Module({
  imports: [JuntaModule, AuditModule],
  controllers: [PlatformController],
  providers: [PlatformService],
})
export class PlatformModule {}
