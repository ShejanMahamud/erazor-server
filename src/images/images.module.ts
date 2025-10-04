import { Module } from '@nestjs/common';
import { BillingModule } from 'src/billing/billing.module';
import { NotificationModule } from 'src/notification/notification.module';
import { QueueModule } from 'src/queue/queue.module';
import { ImageEventsController } from './events/image-events.controller';
import { ImageEventsService } from './events/image-events.service';
import { ImageGateway } from './image.gateway';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { ImageProcessor } from './processors/image.processor';

@Module({
  imports: [QueueModule, NotificationModule, BillingModule],
  controllers: [ImagesController, ImageEventsController],
  providers: [ImagesService, ImageGateway, ImageProcessor, ImageEventsService],
})
export class ImagesModule { }
