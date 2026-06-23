import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';

import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  const config = app.get(ConfigService);

  app.setGlobalPrefix('api/v1');
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));

  const origins = (config.get<string>('CORS_ALLOWED_ORIGINS') || '')
    .split(',')
    .map((x) => x.trim())
    .filter(Boolean);

  app.enableCors({ origin: origins.length > 0 ? origins : true, credentials: true });

  const swagger = new DocumentBuilder()
    .setTitle('CompTrack API')
    .setDescription('Comp-off and overtime management API')
    .setVersion('1.0.0')
    .addBearerAuth()
    .build();

  const doc = SwaggerModule.createDocument(app, swagger);
  SwaggerModule.setup('docs', app, doc);

  const port = Number(config.get('PORT') || 8080);
  await app.listen(port);
}

bootstrap();
