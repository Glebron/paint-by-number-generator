import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
  Param,
  Body,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname } from 'path';
import { ProcessingService } from '../processing/processing.service';
import { ProjectService } from './project.service';
import { Express } from 'express';

@Controller('project')
export class ProjectController {
  constructor(
    private readonly processingService: ProcessingService,
    private readonly projectService: ProjectService,
  ) {}

  @Post()
  createProject(@Body() body: { title: string; imageUrl: string; numColors: number }) {
    return {
      id: Date.now(),
      ...body,
    };
  }

  @Post(':id/process')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
    }),
  )
  async processProjectWithFile(
    @Param('id') id: string,
    @UploadedFile() file: Express.Multer.File,
  ) {
    // ✅ Just call the service
    return this.projectService.processUploadedFile(file);
  }
}
