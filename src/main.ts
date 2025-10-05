import { ValidationPipe } from '@nestjs/common';
import { NestFactory, Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { useApitally } from "apitally/nestjs";
import * as bodyParser from 'body-parser';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { WinstonModule } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/all-exception.filter';
import { ApiKeyGuard } from './guards/api-key.guard';
import "./instrument";
import { LoggerInterceptor } from './logger/logger.interceptor';
import { SanitizePipe } from './pipes/sanitize.pipe';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
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
  const reflector = app.get(Reflector);
  app.use(bodyParser.json({
    limit: '50kb',
    type: ['application/json', 'text/json']
  }));
  app.use(bodyParser.urlencoded({
    limit: '50kb',
    extended: true,
    parameterLimit: 100
  }));

  app.use(cookieParser());

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

  await useApitally(app, {
    clientId: process.env.API_TALLY_CLIENT_ID!,
    env: process.env.API_TALLY_ENV!,
    requestLogging: {
      enabled: true,
      logRequestHeaders: true,
      logRequestBody: true,
      logResponseBody: true,
      captureLogs: true,
    },
  });

  app.enableCors({
    origin: [process.env.PROD_ORIGIN!, process.env.DEV_ORIGIN!],
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

  app.useGlobalGuards(new ApiKeyGuard(reflector));

  app.useGlobalFilters(new AllExceptionsFilter());

  app.setGlobalPrefix('v1/api');


  if (process.env.NODE_ENV !== 'production' || process.env.ENABLE_REQUEST_LOGGING === 'true') {
    const loggingInterceptor = app.get(LoggerInterceptor);
    app.useGlobalInterceptors(loggingInterceptor);
  }
  const requiredEnvVars = [
    'DATABASE_URL',
    'LOCAL_ORIGIN',
    'DEV_ORIGIN',
    'PROD_ORIGIN',
    'API_TALLY_CLIENT_ID',
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
