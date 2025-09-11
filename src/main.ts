import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { LoggerInterceptor } from './logger/logger.interceptor';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN || 'https://fleet-albacore-free.ngrok-free.app',

    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );
  app.use(helmet());
  app.setGlobalPrefix('v1/api');
  const loggingInterceptor = app.get(LoggerInterceptor);
  app.useGlobalInterceptors(loggingInterceptor);
  const requiredEnvVars = [
    'DATABASE_URL',
    'CORS_ORIGIN',
    'CLERK_PUBLISHABLE_KEY',
    'CLERK_SECRET_KEY',
    'ARCJET_API_KEY',
    'ARCJET_ENV',
    'PORT',
    'POLAR_ACCESS_TOKEN',
    'POLAR_WEBHOOK_SECRET',
    'REDIS_HOST',
    'REDIS_PORT',
    'REDIS_PASSWORD',
    'DATABASE_URL',
    'POSTGRES_DB',
    'POSTGRES_USER',
    'POSTGRES_PASSWORD',
    'POSTGRES_PORT',
    'CLOUDINARY_CLOUD_NAME',
    'CLOUDINARY_API_KEY',
    'CLOUDINARY_API_SECRET',
    'CLOUDINARY_UPLOAD_FOLDER',
    'CLERK_WEBHOOK_SIGNING_SECRET'
  ];

  requiredEnvVars.forEach((envVar) => {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  });

  const config = new DocumentBuilder()
    .setTitle('Erazor Server')
    .setDescription('The Erazor Server API description')
    .setVersion('1.0')
    .addBearerAuth()
    .build();
  const documentFactory = () => SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('/v1/api/docs', app, documentFactory);

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
