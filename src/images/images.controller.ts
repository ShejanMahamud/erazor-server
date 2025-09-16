import { BadRequestException, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { randomUUID } from 'crypto';
import type { Request } from 'express';
import { ImageStatus, Permissions, Roles } from 'generated/prisma';
import { diskStorage } from 'multer';
import { extname } from 'path/win32';
import { FileSizeLimitInterceptor } from 'src/common/interceptors/subscription-file-validation';
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


@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) { }

  @UseGuards(OptionalClerkGuard, RateLimitGuard(20, 60, 3), ActiveSubscriptionGuard, HasCreditGuard)
  @Post('process')
  @UseInterceptors(FileInterceptor('file', {
    storage: diskStorage({
      destination: '/tmp', // save to /tmp
      filename: (_, file, callback) => {
        const uniqueName = randomUUID() + extname(file.originalname);
        callback(null, uniqueName);
      },
    }),
    limits: {
      fileSize: 20 * 1024 * 1024,
      //reject the request if file size > 20MB
    },
    fileFilter: (_, file, cb) => {
      if (file.mimetype.match(/\/(jpg|jpeg|png|gif|bmp|tiff|webp)$/)) {
        cb(null, true);
      } else {
        cb(new BadRequestException('Only image files are allowed!'), false);
      }
    }
  }), FileSizeLimitInterceptor)
  processImage(@Req() req: Request, @UploadedFile() file: Express.Multer.File) {
    return this.imagesService.processImage(req.user.sub, file);
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
