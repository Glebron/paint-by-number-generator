import { Module } from '@nestjs/common';
import { UploadController } from 'src/uploads/upload.controller';

@Module({
  controllers: [UploadController],
})
export class UploadModule {}
