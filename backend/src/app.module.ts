// src/app.module.ts
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config'; // ✅ Add this
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ProjectModule } from './project/project.module';
import { UploadModule } from './upload/upload.module';
import { ProcessingService } from './processing/processing.service';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true, // ✅ so you don't need to import it in every module
    }),
    ProjectModule,
    UploadModule,
  ],
  controllers: [AppController],
  providers: [AppService, ProcessingService],
})
export class AppModule {}
