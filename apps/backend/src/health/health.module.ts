import { Module } from '@nestjs/common';
import { HealthController } from './health.controller';
import { S3StorageService } from '../infrastructure/storage/s3-storage.service';

@Module({
  controllers: [HealthController],
  providers: [S3StorageService],
})
export class HealthModule {}
