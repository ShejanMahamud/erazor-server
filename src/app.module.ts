import {
  ArcjetModule,
  detectBot,
  fixedWindow,
  shield
} from '@arcjet/nest';
import { HttpModule } from '@nestjs/axios';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { TerminusModule } from '@nestjs/terminus';
import { SentryModule } from '@sentry/nestjs/setup';
import { AdminModule } from './admin/admin.module';
import { AppController } from './app.controller';
import { BillingModule } from './billing/billing.module';
import { PolarModule } from './billing/polar.module';
import { ClerkModule } from './clerk/clerk.module';
import { CronModule } from './cron/cron.module';
import { ImagesModule } from './images/images.module';
import { LoggerModule } from './logger/logger.module';
import { NotificationModule } from './notification/notification.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    HttpModule,
    TerminusModule,
    SentryModule.forRoot(),
    LoggerModule,
    PrismaModule,
    ClerkModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY!,
      rules: [
        shield({
          mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN',
        }),

        detectBot({
          mode: process.env.NODE_ENV === 'production' ? 'LIVE' : 'DRY_RUN',
          allow: [
            'CATEGORY:SEARCH_ENGINE',
            'CATEGORY:MONITOR',
          ],
        }),

        fixedWindow({
          mode: 'LIVE',
          window: '60s',
          max: 60,
        }),
        fixedWindow({
          mode: 'LIVE',
          window: '30d',
          max: 10,
          characteristics: ['/images/remove-bg'],
        }),
      ],
    })
    ,
    BillingModule,
    ImagesModule,
    UsersModule,
    PolarModule,
    QueueModule,
    NotificationModule,
    AdminModule,
    CronModule
  ],
  controllers: [AppController],
  providers: [
    // {
    //   provide: APP_GUARD,
    //   useClass: ArcjetGuard,
    // },
  ],
})
export class AppModule { }
