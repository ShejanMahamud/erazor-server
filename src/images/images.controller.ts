import { Body, Controller, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { rembg } from '@remove-background-ai/rembg.js';
import { ImagesService } from './images.service';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) { }

  @Post('process')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  }))
  processImage(@Body() { clerkId }: { clerkId: string }, @UploadedFile() file: Express.Multer.File) {
    return this.imagesService.processImage(clerkId, file);
  }

  @Post('process/free')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  }))
  async processImageFree(@UploadedFile() file: Express.Multer.File) {
    const onDownloadProgress = console.log;
    const onUploadProgress = console.log;
    const result = await rembg({
      apiKey: process.env.IMAGE_PROCESSOR_FREE_API_KEY!,
      inputImage: file.buffer,
      onDownloadProgress,
      onUploadProgress,
      options: {
        returnBase64: true,
        w: 1024,
        h: 1024,
      }
    })
    return result.base64Image
  }
}
