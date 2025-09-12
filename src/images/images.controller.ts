import { Body, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Query, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImageStatus, Permissions, Roles } from 'generated/prisma';
import { PermissionsRequired } from 'src/decorators/permissions.decorator';
import { RolesRequired } from 'src/decorators/roles.decorator';
import { ClerkGuard } from 'src/guards/clerk-guard';
import { FileSizeLimitGuard } from 'src/guards/file-size-limit.guard';
import { HasCreditGuard } from 'src/guards/has-credit.guard';
import { PermissionsGuard } from 'src/guards/permissions.guard';
import { RolesGuard } from 'src/guards/roles.guard';
import { ActiveSubscriptionGuard } from 'src/guards/subscription-status.guard';
import { ImagesService } from './images.service';

@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) { }

  @UseGuards(ClerkGuard, ActiveSubscriptionGuard, HasCreditGuard, FileSizeLimitGuard)
  @Post('process')
  @UseInterceptors(FileInterceptor('file', {
    limits: {
      fileSize: 20 * 1024 * 1024,
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

}
