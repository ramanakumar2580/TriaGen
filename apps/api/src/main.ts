import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Match the Nginx /api route
  app.setGlobalPrefix('api');

  // 🔥 FIX: Hardcoded live URL to completely bypass Docker ENV issues
  app.enableCors({
    origin: ['http://localhost:3000', 'https://triagen.16.176.173.35.sslip.io'],
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // 2. Enable Validation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
    }),
  );

  const port = process.env.PORT || 4000;
  await app.listen(port, '0.0.0.0');

  logger.log(`🚀 Server running on: http://0.0.0.0:${port}/api`); // Updated log
  logger.log(`Enable CORS for: localhost and live frontend`);
}
void bootstrap();
