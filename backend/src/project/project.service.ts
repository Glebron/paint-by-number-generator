import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ProcessingService } from '../processing/processing.service';
import { CreateProjectDto } from './dto/create-project.dto';
import { UpdateProjectDto } from './dto/update-project.dto';
import * as path from 'path';

@Injectable()
export class ProjectService {
  constructor(
    private prisma: PrismaService,
    private processingService: ProcessingService,
  ) {}

  create(createProjectDto: CreateProjectDto) {
    return this.prisma.project.create({
      data: {
        imageUrl: createProjectDto.imageUrl,
        status: createProjectDto.status ?? 'pending', // default if undefined
        processedImageUrl: undefined, // better to use undefined
        processedSvgUrl: undefined,   // better to use undefined
      },
    });
  }

  async processProject(id: number) {
    // Mark project as processing
    await this.prisma.project.update({
      where: { id },
      data: { status: 'processing' },
    });

    // Fetch project
    const project = await this.prisma.project.findUnique({
      where: { id },
    });

    if (!project) throw new Error('Project not found');

    // Paths
    const imagePath = path.join(__dirname, '..', '..', 'uploads', path.basename(project.imageUrl));
    const timestamp = Date.now();
    const outputFileName = `processed-${project.id}-${timestamp}`;

    // Run processing (quantization + edges + SVG)
    const { processedImageUrl } = await this.processingService.processImage(
      imagePath,
      25,
      outputFileName
    );

    // Update project with processed image and SVG URLs
    await this.prisma.project.update({
      where: { id },
      data: {
        status: 'completed',
        processedImageUrl,
       // processedSvgUrl,
      },
    });

    return {
      message: 'Processing completed',
      processedImageUrl,
      //processedSvgUrl,
    };
  }

  findAll() {
    return this.prisma.project.findMany();
  }

  findOne(id: number) {
    return this.prisma.project.findUnique({
      where: { id },
    });
  }

  update(id: number, updateProjectDto: UpdateProjectDto) {
    return this.prisma.project.update({
      where: { id },
      data: updateProjectDto,
    });
  }

  remove(id: number) {
    return this.prisma.project.delete({
      where: { id },
    });
  }
}
