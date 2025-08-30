import { Injectable, BadRequestException } from '@nestjs/common';
import { ProcessingService } from '../processing/processing.service';
import * as path from 'path';
import { Express } from 'express';

@Injectable()
export class ProjectService {
  constructor(private readonly processingService: ProcessingService) {}

  async processUploadedFile(file: Express.Multer.File): Promise<{ processedImageUrl: string }> {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const imagePath = path.join(__dirname, '..', '..', 'uploads', file.filename);
    const outputFileName = `processed-${Date.now()}`;

    const { processedImageUrl } = await this.processingService.processImage(
      imagePath,
      25,
      outputFileName
    );

    return {
      processedImageUrl,
    };
  }
}
