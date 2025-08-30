import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { UploadModule } from './upload/upload.module';
import { ProcessingService } from './processing/processing.service';

@Module({
  imports: [ProjectModule, UploadModule],
  controllers: [AppController],
  providers: [AppService, ProcessingService],
})
export class AppModule {}
