import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { NestExpressApplication } from '@nestjs/platform-express';
import { join } from 'path';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule);

  // Serve /uploads for uploads
  app.useStaticAssets(join(__dirname, '..', 'uploads'));

  // Serve /processed for processed images
  app.useStaticAssets(join(__dirname, '..', 'uploads', 'processed'), {
    prefix: '/processed',
  });

  app.enableCors();

  await app.listen(3000);
}
bootstrap();


