import { Injectable } from '@nestjs/common';
import * as path from 'path';
import * as fs from 'fs';
import * as archiver from 'archiver';
import * as FormData from 'form-data';
import axios from 'axios';

const sharp = require('sharp');
const quantize = require('quantize');

@Injectable()
export class ProcessingService {


async processImage(
  imagePath: string,
  numColors: number,
  outputFileName: string
): Promise<{ processedImageUrl: string; processedSvgUrl?: string; zipUrl: string }> {
  const outputDir = path.join(__dirname, '..', '..', 'uploads', 'processed');
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  

  const outputPath = path.join(outputDir, `${outputFileName}.png`);

  if (!fs.existsSync(imagePath)) {
    throw new Error(`Input image not found: ${imagePath}`);
  }

  try {
   fs.copyFileSync(imagePath, outputPath);
console.log('Using raw input image without stylizing.');


    console.log('Stylized image received and saved to:', outputPath);

    // Step 2: Continue your logic as normal
    const preprocessedBuffer = await this.preprocessImage(outputPath, 1024);

    const { data, info } = await sharp(preprocessedBuffer)
      .removeAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const pixels: [number, number, number][] = [];
    for (let i = 0; i < data.length; i += 3) {
      pixels.push([data[i], data[i + 1], data[i + 2]]);
    }

    const cmap = quantize(pixels, numColors);
    if (!cmap) throw new Error('Failed to generate color palette');

    const palette = cmap.palette();
    const mappedBuffer = Buffer.alloc(info.width * info.height * 3);
    const mappedIndices = new Uint8Array(info.width * info.height);

    for (let i = 0; i < pixels.length; i++) {
      const [r, g, b] = pixels[i];
      let closestIndex = 0;
      let minDistance = this.colorDistance([r, g, b], palette[0]);

      for (let j = 1; j < palette.length; j++) {
        const d = this.colorDistance([r, g, b], palette[j]);
        if (d < minDistance) {
          minDistance = d;
          closestIndex = j;
        }
      }

      const closest = palette[closestIndex];
      mappedBuffer[i * 3] = closest[0];
      mappedBuffer[i * 3 + 1] = closest[1];
      mappedBuffer[i * 3 + 2] = closest[2];
      mappedIndices[i] = closestIndex + 1;
    }

    

const quantizedImageBuffer = await sharp(mappedBuffer, {
  raw: { width: info.width, height: info.height, channels: 3 },
}).png().toBuffer();

await sharp({
  create: {
    width: info.width,
    height: info.height,
    channels: 3,
    background: { r: 255, g: 255, b: 255 },
  },
})
  .composite([{ input: quantizedImageBuffer }])
  .png()
  .toFile(outputPath);


    await sharp({
      create: {
        width: info.width,
        height: info.height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite([{ input: quantizedImageBuffer }])
      .png()
      .toFile(outputPath);

    console.log('Quantized image re-saved to:', outputPath);

   //Borders(mappedIndices, palette, info.width, info.height, outputFileName);
    await this.generatePaletteImage(palette, outputFileName);
    const zipPath = await this.generateZip(outputFileName);

    return {
  processedImageUrl: `/processed/${outputFileName}.png`,
  // processedSvgUrl: `/processed/${outputFileName}.svg`,
  zipUrl: `/processed/${outputFileName}.zip`,
};
  } catch (err) {
    console.error('Failed to stylize/process image:', err);
    throw err;
  }
}


  private async preprocessImage(imagePath: string, width: number): Promise<Buffer> {
    return sharp(imagePath)
      .resize(width)
      .modulate({ brightness: 1.2, saturation: 1.0 })
      .linear(1.1, -30)
      .toBuffer();
  }

  private async generateOutlinedImage(
  mappedIndices: Uint8Array,
  width: number,
  height: number,
  outputPath: string
): Promise<void> {
  const buffer = Buffer.alloc(width * height * 3, 255); // all white

  const getIndex = (x: number, y: number) => y * width + x;

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const center = mappedIndices[getIndex(x, y)];
      const left = mappedIndices[getIndex(x - 1, y)];
      const right = mappedIndices[getIndex(x + 1, y)];
      const top = mappedIndices[getIndex(x, y - 1)];
      const bottom = mappedIndices[getIndex(x, y + 1)];

      const isBorder =
        center !== left ||
        center !== right ||
        center !== top ||
        center !== bottom;

      if (isBorder) {
        const i = getIndex(x, y) * 3;
        buffer[i] = 0;
        buffer[i + 1] = 0;
        buffer[i + 2] = 0;
      }
    }
  }

  await sharp(buffer, {
    raw: { width, height, channels: 3 }
  }).png().toFile(outputPath);

  console.log('Outlined paint-by-number saved to:', outputPath);
}


  private colorDistance(c1: [number, number, number], c2: [number, number, number]): number {
    return Math.sqrt(
      Math.pow(c1[0] - c2[0], 2) +
      Math.pow(c1[1] - c2[1], 2) +
      Math.pow(c1[2] - c2[2], 2)
    );
  }

// private mergeSmallRegions(
//   values2D: number[][],
//   minSize = 100
// ): number[][] {
//   const height = values2D.length;
//   const width = values2D[0].length;
//   const visited = Array.from({ length: height }, () => Array(width).fill(false));
//   const directions = [
//     [0, 1], [1, 0], [0, -1], [-1, 0],
//   ];

//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       if (visited[y][x]) continue;

//       const currentVal = values2D[y][x];
//       const region: [number, number][] = [];
//       const stack = [[x, y]];
//       const neighborCount: Record<number, number> = {};

//       while (stack.length > 0) {
//         const [cx, cy] = stack.pop()!;
//         if (
//           cx < 0 || cy < 0 || cx >= width || cy >= height ||
//           visited[cy][cx] || values2D[cy][cx] !== currentVal
//         ) continue;

//         visited[cy][cx] = true;
//         region.push([cx, cy]);

//         for (const [dx, dy] of directions) {
//           const nx = cx + dx;
//           const ny = cy + dy;

//           if (
//             nx >= 0 && ny >= 0 && nx < width && ny < height &&
//             values2D[ny][nx] !== currentVal
//           ) {
//             const neighborVal = values2D[ny][nx];
//             neighborCount[neighborVal] = (neighborCount[neighborVal] || 0) + 1;
//           } else {
//             stack.push([nx, ny]);
//           }
//         }
//       }

//       if (region.length < minSize && Object.keys(neighborCount).length > 0) {
//         const dominantNeighbor = +Object.entries(neighborCount)
//           .sort((a, b) => b[1] - a[1])[0][0];

//         for (const [rx, ry] of region) {
//           values2D[ry][rx] = dominantNeighbor;
//         }
//       }
//     }
//   }

//   return values2D;
// }

// private async createSVGWithColorBorders(
//   mappedIndices: Uint8Array,
//   palette: [number, number, number][],
//   width: number,
//   height: number,
//   outputFileName: string,
// ): Promise<void> {
//   const outputDir = path.join(__dirname, '..', '..', 'uploads', 'processed');
//   const svgPath = path.join(outputDir, `${outputFileName}.svg`);

//   let values2D = Array.from({ length: height }, (_, y) =>
//     Array.from({ length: width }, (_, x) => mappedIndices[y * width + x])
//   );

//   values2D = this.mergeSmallRegions(values2D, 100);

//   let svgContent = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">\n`;
//   svgContent += `  <rect width="${width}" height="${height}" fill="white" />\n`;

//   for (let y = 0; y < height; y++) {
//     for (let x = 0; x < width; x++) {
//       const current = values2D[y][x];

//       if (current === 0) continue; // 👈 skip removed (white) pixels

//       const color = palette[current - 1];
//       const hex = `#${color[0].toString(16).padStart(2, '0')}${color[1].toString(16).padStart(2, '0')}${color[2].toString(16).padStart(2, '0')}`;

//       let stroke = '';
//       if (x > 0 && values2D[y][x - 1] !== current) stroke = 'left';
//       else if (x < width - 1 && values2D[y][x + 1] !== current) stroke = 'right';
//       else if (y > 0 && values2D[y - 1][x] !== current) stroke = 'top';
//       else if (y < height - 1 && values2D[y + 1][x] !== current) stroke = 'bottom';

//       if (stroke) {
//         svgContent += `<rect x="${x}" y="${y}" width="1" height="1" fill="${hex}" stroke="black" stroke-width="0.1" />\n`;
//       } else {
//         svgContent += `<rect x="${x}" y="${y}" width="1" height="1" fill="${hex}" />\n`;
//       }
//     }
//   }

//   svgContent += `</svg>`;

//   fs.writeFileSync(svgPath, svgContent, 'utf8');
//   console.log('SVG with color borders saved to:', svgPath);
// }


  private async generatePaletteImage(palette: [number, number, number][], outputFileName: string): Promise<void> {
    const boxSize = 80;
    const width = boxSize * palette.length;
    const height = boxSize;

    const paletteBuffer = await sharp({
      create: {
        width,
        height,
        channels: 3,
        background: { r: 255, g: 255, b: 255 },
      },
    })
      .composite(
        palette.map((color, i) => ({
          input: {
            create: {
              width: boxSize,
              height: boxSize,
              channels: 3,
              background: { r: color[0], g: color[1], b: color[2] },
            },
          },
          left: i * boxSize,
          top: 0,
        }))
      )
      .png()
      .toBuffer();

    const outputDir = path.join(__dirname, '..', '..', 'uploads', 'processed');
    const palettePath = path.join(outputDir, `${outputFileName}-palette.png`);
    await sharp(paletteBuffer).toFile(palettePath);

    console.log('Palette image saved to:', palettePath);
  }

  private async generateZip(outputFileName: string): Promise<string> {
    const outputDir = path.join(__dirname, '..', '..', 'uploads', 'processed');
    const zipPath = path.join(outputDir, `${outputFileName}.zip`);
    const output = fs.createWriteStream(zipPath);
    const archive = archiver('zip', { zlib: { level: 9 } });

    return new Promise((resolve, reject) => {
      output.on('close', () => {
        console.log(`ZIP file saved to: ${zipPath} (${archive.pointer()} total bytes)`);
        resolve(zipPath);
      });

      archive.on('error', err => reject(err));

      archive.pipe(output);

      archive.file(path.join(outputDir, `${outputFileName}.png`), { name: `${outputFileName}.png` });
     // archive.file(path.join(outputDir, `${outputFileName}.svg`), { name: `${outputFileName}.svg` });
      archive.file(path.join(outputDir, `${outputFileName}-palette.png`), { name: `${outputFileName}-palette.png` });

      archive.append(`Paint by Numbers pack generated for ${outputFileName}\nEnjoy your painting!`, { name: 'README.txt' });

      archive.finalize();
    });
  }
}
