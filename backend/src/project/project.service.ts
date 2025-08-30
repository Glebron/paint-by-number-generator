import { Injectable } from '@nestjs/common';
import { ProcessingService } from '../processing/processing.service';
import * as path from 'path';

@Injectable()
export class ProjectService {
  constructor(private processingService: ProcessingService) {}

  async processProject(_id: number) {
    const timestamp = Date.now();
    const dummyImagePath = path.join(__dirname, '..', '..', 'uploads', 'example.jpg');
    const outputFileName = `processed-${timestamp}`;

    const { processedImageUrl } = await this.processingService.processImage(
      dummyImagePath,
      25,
      outputFileName
    );

    return {
      message: 'Processing completed (mocked)',
      processedImageUrl,
    };
  }
}
