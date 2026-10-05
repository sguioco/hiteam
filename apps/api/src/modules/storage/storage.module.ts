import { Global, Module } from '@nestjs/common';
import { StorageController } from './storage.controller';
import { StorageService } from './storage.service';
import { TaskPhotoAccessService } from './task-photo-access.service';

@Global()
@Module({
  controllers: [StorageController],
  providers: [StorageService, TaskPhotoAccessService],
  exports: [StorageService],
})
export class StorageModule {}
