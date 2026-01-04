import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe, Logger } from '@nestjs/common';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // 👇 FIX: Use the Environment Variable instead of hardcoded localhost
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

  app.enableCors({
    origin: [frontendUrl], // 👈 Dynamically allows your live server OR localhost
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

  logger.log(`🚀 Server running on: http://0.0.0.0:${port}`);
  logger.log(`Enable CORS for: ${frontendUrl}`); // Helpful log to see what's allowed
}
void bootstrap();
