import { Module } from '@nestjs/common';
import { NotificationModule } from 'src/notification/notification.module';
import { QueueModule } from 'src/queue/queue.module';
import { ImageGateway } from './image.gateway';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { ImageProcessor } from './processors/image.processor';

@Module({
  imports: [QueueModule, NotificationModule],
  controllers: [ImagesController],
  providers: [ImagesService, ImageGateway, ImageProcessor],
})
export class ImagesModule { }
