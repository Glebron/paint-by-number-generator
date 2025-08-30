import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { ProcessingService } from '../processing/processing.service';

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, ProcessingService],
})
export class ProjectModule {}
