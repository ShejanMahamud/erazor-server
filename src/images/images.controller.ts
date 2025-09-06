import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { rembg } from '@remove-background-ai/rembg.js';
import { ImageStatus, Permissions, Roles } from 'generated/prisma';
import { PermissionsRequired } from 'src/decorators/permissions.decorator';
import { RolesRequired } from 'src/decorators/roles.decorator';
import { ClerkGuard } from 'src/guards/clerk-guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { ImagesService } from './images.service';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) { }

  @UseGuards(ClerkGuard)
  @Post('process')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 5 * 1024 * 1024,
    }
  }))
  processImage(@Body() { userId }: { userId: string }, @UploadedFile() file: Express.Multer.File) {
    return this.imagesService.processImage(userId, file);
  }

  @UseGuards(ClerkGuard)
  @Get('user/:id')
  findAllImagesByUserId(@Param('id') userId: string, @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number, @Query('cursor') cursor?: string, @Query('search') search?: string, @Query('status') status?: ImageStatus) {
    return this.imagesService.findAllImagesByUserId(userId, limit, cursor, search, status);
  }
  @RolesRequired(Roles.ADMIN)
  @UseGuards(ClerkGuard, RolesGuard)
  @Get()
  findAllImages(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number, @Query('cursor') cursor?: string, @Query('search') search?: string, @Query('status') status?: ImageStatus) {
    return this.imagesService.findAllImages(limit, cursor, search, status);
  }

  @UseGuards(ClerkGuard)
  @Get(':id')
  findImageById(@Param('id') id: string) {
    return this.imagesService.findImageById(id);
  }

  @RolesRequired(Roles.ADMIN || Roles.MODERATOR)
  @PermissionsRequired(Permissions.DELETE_IMAGES)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Delete('delete/:id')
  deleteImage(@Param('id') id: string) {
    return this.imagesService.deleteImage(id);
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
