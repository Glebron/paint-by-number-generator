import {
  Controller,
  Post,
  UploadedFile,
  UseInterceptors,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import { v4 as uuidv4 } from 'uuid';
import { extname, join } from 'path';
import { ProcessingService } from '../processing/processing.service';

@Controller('project')
export class ProjectController {
  constructor(private readonly processingService: ProcessingService) {}

  @Post('process')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './uploads',
        filename: (req, file, callback) => {
          const uniqueName = `${uuidv4()}${extname(file.originalname)}`;
          callback(null, uniqueName);
        },
      }),
      limits: {
        fileSize: 5 * 1024 * 1024, // ✅ Limit to 5MB
      },
      fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|webp/;
        const ext = extname(file.originalname).toLowerCase();
        if (!allowedTypes.test(ext)) {
          return cb(new BadRequestException('Unsupported file type'), false);
        }
        cb(null, true);
      },
    }),
  )
  async process(@UploadedFile() file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const imagePath = join(__dirname, '..', '..', 'uploads', file.filename);
    const outputFileName = `processed-${Date.now()}`;

    const result = await this.processingService.processImage(
      imagePath,
      25, // fixed numColors
      outputFileName,
    );

    return {
      message: 'Processing complete',
      processedImageUrl: result.processedImageUrl,
    };
  }
}
