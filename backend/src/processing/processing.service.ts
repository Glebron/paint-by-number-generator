import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as unzipper from 'unzipper';
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
      // 🧠 Apply Flask stylization and extract files
      const stylizedPath = await this.applyFlaskStylization(imagePath);

      // 🎨 Preprocess the stylized image (gentler)
      const preprocessedBuffer = await sharp(stylizedPath)
        .resize(1024)
        .modulate({ brightness: 1.05, saturation: 1.05 })
        .linear(1.0, 0)
        .gamma(1.2)
        .toBuffer();

      const finalPath = path.join(outputDir, `${outputFileName}.png`);
      await sharp(preprocessedBuffer).toFile(finalPath);

      console.log('Final processed image saved to:', finalPath);

      return {
        processedImageUrl: `/processed/${outputFileName}.png`,
        zipUrl: `/processed/${outputFileName}.zip`, // optional, not generated yet
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

    const zipBuffer = Buffer.from(response.data);
    const tempDir = path.dirname(imagePath);

    // 🧩 Unzip returned buffer to temp dir
    await unzipper.Open.buffer(zipBuffer).then(d => d.extract({ path: tempDir }));

    const colorPath = path.join(tempDir, 'output_colored.png');
    if (!fs.existsSync(colorPath)) {
      throw new Error('output_colored.png not found after unzip');
    }

    console.log('Stylized version extracted to:', colorPath);
    return colorPath;
  }
}