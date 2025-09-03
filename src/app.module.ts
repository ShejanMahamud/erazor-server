import {
  ArcjetModule,
  detectBot,
  fixedWindow,
  shield
} from '@arcjet/nest';
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { BillingModule } from './billing/billing.module';
import { PolarModule } from './billing/polar.module';
import { ClerkModule } from './clerk/clerk.module';
import { ImagesModule } from './images/images.module';
import { PrismaModule } from './prisma/prisma.module';
import { QueueModule } from './queue/queue.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    ClerkModule,
    ConfigModule.forRoot({ isGlobal: true }),
    ArcjetModule.forRoot({
      isGlobal: true,
      key: process.env.ARCJET_KEY!,
      rules: [
        shield({ mode: 'LIVE' }),
        detectBot({
          mode: 'LIVE',
          //allow postman
          allow: [
            'CATEGORY:SEARCH_ENGINE',
            'CATEGORY:MONITOR'
          ],
        }),
        fixedWindow({
          mode: 'LIVE',
          window: '60s',
          max: 100,
        }),
      ],
    }),
    BillingModule,
    ImagesModule,
    UsersModule,
    PolarModule,
    QueueModule
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
