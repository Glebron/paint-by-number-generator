import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { PrismaService } from './prisma/prisma.service';
import { ProjectModule } from './project/project.module';
import { PrismaModule } from './prisma/prisma.module';
import { UploadModule } from './upload/upload.module';
import { ProcessingService } from './processing/processing.service';

@Module({
  imports: [ProjectModule, PrismaModule, UploadModule],
  controllers: [AppController],
  providers: [AppService, PrismaService, ProcessingService],
})
export class AppModule {}
