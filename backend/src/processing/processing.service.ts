// src/processing/processing.service.ts
import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config'; // ✅
import * as path from 'path';
import * as fs from 'fs';
import * as unzipper from 'unzipper';
import FormData from 'form-data';
import axios from 'axios';

const sharp = require('sharp');

@Injectable()
export class ProcessingService {
  constructor(private readonly configService: ConfigService) {} // ✅ Inject it

  async processImage(
    imagePath: string,
    _numColors: number,
    outputFileName: string
  ): Promise<{ processedImageUrl: string; zipUrl: string }> {
    const outputDir = path.join(__dirname, '..', '..', 'uploads', 'processed');

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    if (!fs.existsSync(imagePath)) {
      throw new InternalServerErrorException(`Input image not found: ${imagePath}`);
    }

    try {
      const stylizedPath = await this.applyFlaskStylization(imagePath);

      const preprocessedBuffer = await sharp(stylizedPath)
        .resize(1024)
        .modulate({ brightness: 1.05, saturation: 1.05 })
        .linear(1.0, 0)
        .gamma(1.2)
        .toBuffer();

      const finalPath = path.join(outputDir, `${outputFileName}.png`);
      await sharp(preprocessedBuffer).toFile(finalPath);

      return {
        processedImageUrl: `/processed/${outputFileName}.png`,
        zipUrl: `/processed/${outputFileName}.zip`,
      };
    } catch (err) {
      console.error('❌ Stylization failed:', err);
      throw new InternalServerErrorException('Stylization failed.');
    }
  }

  private async applyFlaskStylization(imagePath: string): Promise<string> {
    const FLASK_API_URL = this.configService.get<string>('FLASK_API_URL'); // ✅

    if (!FLASK_API_URL) {
      throw new InternalServerErrorException('FLASK_API_URL is not defined in .env');
    }

    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));

    const response = await axios.post(`${FLASK_API_URL}/stylize`, form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer',
    });

    const zipBuffer = Buffer.from(response.data);
    const tempDir = path.dirname(imagePath);

    await unzipper.Open.buffer(zipBuffer).then(d => d.extract({ path: tempDir }));

    const colorPath = path.join(tempDir, 'output_colored.png');
    if (!fs.existsSync(colorPath)) {
      throw new InternalServerErrorException('output_colored.png not found after unzip');
    }

    return colorPath;
  }
}
