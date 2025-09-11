import { Module } from '@nestjs/common';
import { NotificationModule } from 'src/notification/notification.module';
import { BillingController } from './billing.controller';
import { BillingService } from './billing.service';

@Module({
  imports: [NotificationModule],
  controllers: [BillingController],
  providers: [BillingService],
})
export class BillingModule { }
