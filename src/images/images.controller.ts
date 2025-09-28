import { BadRequestException, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { randomUUID } from 'crypto';
import type { FastifyRequest } from 'fastify';
import * as fs from 'fs/promises';
import { ImageStatus, Permissions, Roles } from 'generated/prisma';
import { extname } from 'path/win32';
import { PermissionsRequired } from 'src/decorators/permissions.decorator';
import { RolesRequired } from 'src/decorators/roles.decorator';
import { ClerkGuard } from 'src/guards/clerk.guard';
import { HasCreditGuard } from 'src/guards/has-credit.guard';
import { OptionalClerkGuard } from 'src/guards/optional-clerk.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RateLimitGuard } from 'src/guards/rate-limit.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { ActiveSubscriptionGuard } from 'src/guards/subscription-status.guard';
import { ImagesService } from './images.service';
import { ProcessedFile } from './interfaces/images.interface';

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(
    private readonly imagesService: ImagesService,
  ) { }

  @UseGuards(OptionalClerkGuard, RateLimitGuard(20, 60, 3), ActiveSubscriptionGuard, HasCreditGuard)
  @Post('process')
  async processImage(@Req() req: FastifyRequest) {
    try {
      // Check if request is multipart
      if (!req.isMultipart()) {
        throw new BadRequestException('Request must be multipart/form-data');
      }

      // Get the file part from the multipart request
      const data = await req.file();

      if (!data) {
        throw new BadRequestException('No file uploaded');
      }

      // Validate file type
      if (!data.mimetype.match(/\/(jpg|jpeg|png|gif|bmp|tiff|webp)$/)) {
        throw new BadRequestException('Only image files are allowed!');
      }

      // Read the file buffer
      const buffer = await data.toBuffer();

      // Check file size (20MB limit)
      const maxSize = 20 * 1024 * 1024;
      if (buffer.length > maxSize) {
        throw new BadRequestException(`File too large. Maximum size is ${maxSize} bytes`);
      }

      // Generate unique filename
      const uniqueName = randomUUID() + extname(data.filename || '');
      const filePath = `/tmp/${uniqueName}`;

      // Save file to disk
      await fs.writeFile(filePath, buffer);

      // Create file object compatible with your service
      const processedFile: ProcessedFile = {
        filename: uniqueName,
        originalname: data.filename || '',
        mimetype: data.mimetype,
        size: buffer.length,
        path: filePath,
        buffer: buffer
      };

      return this.imagesService.processImage(req.user.sub, processedFile);
    } catch (error) {
      if (error instanceof BadRequestException) {
        throw error;
      }
      throw new BadRequestException('Error processing file upload');
    }
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

}
