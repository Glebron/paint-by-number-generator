import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as archiver from 'archiver';
import * as FormData from 'form-data';
import axios from 'axios';

const sharp = require('sharp');

@Injectable()
export class ProcessingService {
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
      throw new Error(`Input image not found: ${imagePath}`);
    }

    try {
      // 🧠 Apply Flask stylization
      const stylizedPath = await this.applyFlaskStylization(imagePath);

      // 🎨 Preprocess the stylized image (gentler)
      const preprocessedBuffer = await sharp(stylizedPath)
        .resize(1024)
        .modulate({ brightness: 1.05, saturation: 1.05 }) // soft boost
        .linear(1.0, 0) // no harsh contrast
        .gamma(1.2) // lift shadows slightly
        .toBuffer();

      const finalPath = path.join(outputDir, `${outputFileName}.png`);
      await sharp(preprocessedBuffer).toFile(finalPath);

      console.log('Final processed image saved to:', finalPath);

      return {
        processedImageUrl: `/processed/${outputFileName}.png`,
        zipUrl: `/processed/${outputFileName}.zip`,
      };
    } catch (err) {
      console.error('Stylization failed:', err);
      throw err;
    }
  }

  private async applyFlaskStylization(imagePath: string): Promise<string> {
    const form = new FormData();
    form.append('file', fs.createReadStream(imagePath));

    const response = await axios.post('http://localhost:8001/stylize', form, {
      headers: form.getHeaders(),
      responseType: 'arraybuffer',
    });

    const stylizedPath = imagePath.replace(/(\.\w+)$/, '-stylized$1');
    fs.writeFileSync(stylizedPath, Buffer.from(response.data));

    console.log('Stylized version saved to:', stylizedPath);
    return stylizedPath;
  }
}
