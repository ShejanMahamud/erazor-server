import compression from '@fastify/compress';
import cookie from '@fastify/cookie';
import cors from '@fastify/cors';
import helmet from '@fastify/helmet';
import multipart from '@fastify/multipart';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useApitally } from "apitally/nestjs";
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exception.filter';
import "./instrument";
import { LoggerInterceptor } from './logger/logger.interceptor';
import { SanitizePipe } from './pipes/sanitize.pipe';
const fastifyCompression = compression;
const fastifyCookie = cookie;
const fastifyHelmet = helmet;
const fastifyMultipart = multipart;
const fastifyCors = cors;

async function bootstrap() {
  const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter(), {
    logger: WinstonModule.createLogger({
      transports: [
        new winston.transports.Console({
          format: winston.format.combine(
            winston.format.colorize(),
            winston.format.timestamp(),
            winston.format.printf(({ level, message, timestamp }) => {
              return `[${timestamp}] ${level}: ${message}`;
            }),
          ),
        }),
      ],
    }),
  });

  const fastifyInstance = app.getHttpAdapter().getInstance();

  await fastifyInstance.register(fastifyCookie as any, {
    secret: process.env.COOKIE_SECRET,
    hook: 'onRequest',
  });

  await fastifyInstance.register(fastifyMultipart as any, {
    limits: {
      fileSize: 20 * 1024 * 1024, // 20MB
      files: 1,
    },
    addToBody: true,
  });

  await fastifyInstance.register(fastifyHelmet as any, {
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      }
    },
    frameguard: false,
  });

  await fastifyInstance.register(fastifyCors as any, {
    origin: [process.env.CORS_ORIGIN!, 'http://localhost:3000'],
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
    credentials: true,
  });

  await fastifyInstance.register(fastifyCompression as any, { encodings: ['gzip', 'deflate'] });

  await useApitally(app, {
    clientId: "0b1a1ee3-3eb3-4618-b312-f0d66b9f28c5",
    env: "prod", // or "dev"

    // Optionally enable and configure request logging
    requestLogging: {
      enabled: true,
      logRequestHeaders: true,
      logRequestBody: true,
      logResponseBody: true,
      captureLogs: true,
    },
  });

  // app.enableCors({
  //   origin: [process.env.CORS_ORIGIN!, 'http://localhost:3000'],
  //   methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  //   allowedHeaders: ['Authorization', 'Content-Type'],
  //   credentials: true,
  // });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
    new SanitizePipe()
  );
  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('v1/api');


  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_REQUEST_LOGGING === 'true') {
    const loggingInterceptor = app.get(LoggerInterceptor);
    app.useGlobalInterceptors(loggingInterceptor);
  }
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

  if (process.env.NODE_ENV !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('Erazor Server')
      .setDescription('The Erazor Server API description')
      .setVersion('1.0')
      .addBearerAuth()
      .build();

    const documentFactory = () => SwaggerModule.createDocument(app, config);
    const document = documentFactory();
    SwaggerModule.setup('/v1/api/docs', app, documentFactory);
  }

  process.on('SIGTERM', async () => {
    console.log('SIGTERM received, shutting down gracefully...');
    await app.close();
    process.exit(0);
  });
  const port = process.env.PORT ?? 3000;

  await app.listen(port);

  console.log(`🚀 Application is running on: http://0.0.0.0:${port}/v1/api`);
  if (process.env.NODE_ENV !== 'production') {
    console.log(`📚 API Documentation: http://0.0.0.0:${port}/v1/api/docs`);
  }
}
bootstrap().catch(err => {
  console.error('Failed to start application:', err);
  process.exit(1);
});
