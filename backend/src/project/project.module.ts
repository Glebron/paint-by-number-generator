import { Module } from '@nestjs/common';
import { ProjectService } from './project.service';
import { ProjectController } from './project.controller';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessingService } from '../processing/processing.service'; // ADD THIS

@Module({
  controllers: [ProjectController],
  providers: [ProjectService, PrismaService, ProcessingService],
})
export class ProjectModule {}