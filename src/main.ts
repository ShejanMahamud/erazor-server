import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useApitally } from "apitally/nestjs";
import * as bodyParser from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import { writeFileSync } from 'fs';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exception.filter';
import "./instrument";
import { LoggerInterceptor } from './logger/logger.interceptor';
import { SanitizePipe } from './pipes/sanitize.pipe';


async function bootstrap() {
  const app = await NestFactory.create(AppModule);

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

  app.use(compression({
    level: 6,
    threshold: 1024,
    filter: (req, res) => {
      if (req.headers['x-no-compression']) {
        return false;
      }
      return compression.filter(req, res);
    }
  }));

  app.use(cookieParser());
  app.enableCors({
    origin: process.env.CORS_ORIGIN,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Authorization', 'Content-Type'],
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
      disableErrorMessages: process.env.NODE_ENV === 'production',
    }),
    new SanitizePipe()
  );
  app.useGlobalFilters(new AllExceptionsFilter());
  app.use(helmet({
    crossOriginEmbedderPolicy: false,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        scriptSrc: ["'self'"],
        imgSrc: ["'self'", "data:", "https:"],
      }
    }
  }));

  app.use(bodyParser.json({
    limit: '50kb',
    type: ['application/json', 'text/json']
  }));
  app.use(bodyParser.urlencoded({
    limit: '50kb',
    extended: true,
    parameterLimit: 100
  }));
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
    writeFileSync('./openapi.json', JSON.stringify(document, null, 2));
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
