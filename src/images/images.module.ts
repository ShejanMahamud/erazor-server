import { Module } from '@nestjs/common';
import { QueueModule } from 'src/queue/queue.module';
import { ImageGateway } from './image.gateway';
import { ImagesController } from './images.controller';
import { ImagesService } from './images.service';
import { ImageProcessor } from './processors/image.processor';

@Module({
  imports: [QueueModule],
  controllers: [ImagesController],
  providers: [ImagesService, ImageGateway, ImageProcessor],
})
export class ImagesModule { }
