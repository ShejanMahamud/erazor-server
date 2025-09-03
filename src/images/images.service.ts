import { InjectQueue } from '@nestjs/bullmq';
import { Injectable } from '@nestjs/common';
import { Queue } from 'bullmq';
import { IGlobalRes } from 'src/types';
import { IImageService } from './interfaces/images.interface';

@Injectable()
export class ImagesService implements IImageService {

  constructor(@InjectQueue('image-processor') private readonly imageProcessorQueue: Queue) { }

  async processImage(clerkId: string, file: Express.Multer.File): Promise<IGlobalRes<null>> {

    // Extract only serializable properties from the file object
    const serializableFile = {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer.toString('base64'), // Convert buffer to base64 string
      filename: file.filename
    };

    await this.imageProcessorQueue.add('process-image', {
      clerkId,
      file: serializableFile
    });

    return {
      success: true,
      message: "Image processing started"
    }
  }
}
