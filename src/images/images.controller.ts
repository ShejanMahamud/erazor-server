import { BadRequestException, Controller, DefaultValuePipe, Delete, Get, Param, ParseIntPipe, Post, Query, Req, UploadedFile, UseGuards, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiOperation, ApiParam, ApiQuery, ApiResponse, ApiTags } from '@nestjs/swagger';
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

@ApiTags('Images')
@Controller('images')
export class ImagesController {
  constructor(private readonly imagesService: ImagesService) { }

  @ApiOperation({
    summary: 'Process uploaded image',
    description: 'Upload and process an image to remove background. Requires active subscription and credits.'
  })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    description: 'Image file to process',
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Image file (jpg, jpeg, png, gif, bmp, tiff, webp) - Max size: 20MB'
        }
      },
      required: ['file']
    }
  })
  @ApiResponse({
    status: 201,
    description: 'Image processing started successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Image processing started successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-string' },
            ownerId: { type: 'string', nullable: true, example: 'user-id-123' },
            processId: { type: 'string', example: 'process-uuid' },
            originalFileName: { type: 'string', example: 'image.jpg' },
            originalImageUrlLQ: { type: 'string', nullable: true, example: 'https://example.com/image-lq.jpg' },
            originalImageUrlHQ: { type: 'string', nullable: true, example: 'https://example.com/image-hq.jpg' },
            bgRemovedFileName: { type: 'string', nullable: true, example: null },
            bgRemovedImageUrlLQ: { type: 'string', nullable: true, example: null },
            bgRemovedImageUrlHQ: { type: 'string', nullable: true, example: null },
            status: { type: 'string', enum: ['queue', 'processing', 'ready'], example: 'queue' },
            createdAt: { type: 'string', format: 'date-time', example: '2023-09-17T10:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2023-09-17T10:00:00Z' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request - Invalid file format or size',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Only image files are allowed!' }
      }
    }
  })
  @ApiResponse({
    status: 429,
    description: 'Too many requests - Rate limit exceeded',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Rate limit exceeded' }
      }
    }
  })
  @ApiResponse({
    status: 402,
    description: 'Payment required - Insufficient credits or subscription required',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Insufficient credits or active subscription required' }
      }
    }
  })
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

  @ApiOperation({
    summary: 'Get user images',
    description: 'Retrieve all images for a specific user with pagination and filtering options'
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'User ID to fetch images for',
    type: 'string',
    example: 'user-id-123'
  })
  @ApiQuery({
    name: 'limit',
    description: 'Number of items to return per page',
    required: false,
    type: 'number',
    example: 10
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Cursor for pagination (next page)',
    required: false,
    type: 'string',
    example: 'cursor-string'
  })
  @ApiQuery({
    name: 'search',
    description: 'Search term to filter images by filename',
    required: false,
    type: 'string',
    example: 'image-name'
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter images by processing status',
    required: false,
    enum: ['queue', 'processing', 'ready'],
    example: 'ready'
  })
  @ApiResponse({
    status: 200,
    description: 'User images retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Images retrieved successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid-string' },
              ownerId: { type: 'string', nullable: true, example: 'user-id-123' },
              processId: { type: 'string', example: 'process-uuid' },
              originalFileName: { type: 'string', example: 'image.jpg' },
              originalImageUrlLQ: { type: 'string', nullable: true, example: 'https://example.com/image-lq.jpg' },
              originalImageUrlHQ: { type: 'string', nullable: true, example: 'https://example.com/image-hq.jpg' },
              bgRemovedFileName: { type: 'string', nullable: true, example: 'processed-image.png' },
              bgRemovedImageUrlLQ: { type: 'string', nullable: true, example: 'https://example.com/processed-lq.png' },
              bgRemovedImageUrlHQ: { type: 'string', nullable: true, example: 'https://example.com/processed-hq.png' },
              status: { type: 'string', enum: ['queue', 'processing', 'ready'], example: 'ready' },
              createdAt: { type: 'string', format: 'date-time', example: '2023-09-17T10:00:00Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2023-09-17T10:00:00Z' }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            limit: { type: 'number', example: 10 },
            count: { type: 'number', example: 25 },
            hasNextPage: { type: 'boolean', example: true },
            nextCursor: { type: 'string', nullable: true, example: 'next-cursor-string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Authentication required' }
      }
    }
  })
  @UseGuards(ClerkGuard)
  @Get('user/:id')
  findAllImagesByUserId(@Param('id') userId: string, @Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number, @Query('cursor') cursor?: string, @Query('search') search?: string, @Query('status') status?: ImageStatus) {
    return this.imagesService.findAllImagesByUserId(userId, limit, cursor, search, status);
  }

  @ApiOperation({
    summary: 'Get all images (Admin only)',
    description: 'Retrieve all images in the system with pagination and filtering options. Requires admin role.'
  })
  @ApiBearerAuth()
  @ApiQuery({
    name: 'limit',
    description: 'Number of items to return per page',
    required: false,
    type: 'number',
    example: 10
  })
  @ApiQuery({
    name: 'cursor',
    description: 'Cursor for pagination (next page)',
    required: false,
    type: 'string',
    example: 'cursor-string'
  })
  @ApiQuery({
    name: 'search',
    description: 'Search term to filter images by filename',
    required: false,
    type: 'string',
    example: 'image-name'
  })
  @ApiQuery({
    name: 'status',
    description: 'Filter images by processing status',
    required: false,
    enum: ['queue', 'processing', 'ready'],
    example: 'ready'
  })
  @ApiResponse({
    status: 200,
    description: 'All images retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Images retrieved successfully' },
        data: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string', example: 'uuid-string' },
              ownerId: { type: 'string', nullable: true, example: 'user-id-123' },
              processId: { type: 'string', example: 'process-uuid' },
              originalFileName: { type: 'string', example: 'image.jpg' },
              originalImageUrlLQ: { type: 'string', nullable: true, example: 'https://example.com/image-lq.jpg' },
              originalImageUrlHQ: { type: 'string', nullable: true, example: 'https://example.com/image-hq.jpg' },
              bgRemovedFileName: { type: 'string', nullable: true, example: 'processed-image.png' },
              bgRemovedImageUrlLQ: { type: 'string', nullable: true, example: 'https://example.com/processed-lq.png' },
              bgRemovedImageUrlHQ: { type: 'string', nullable: true, example: 'https://example.com/processed-hq.png' },
              status: { type: 'string', enum: ['queue', 'processing', 'ready'], example: 'ready' },
              createdAt: { type: 'string', format: 'date-time', example: '2023-09-17T10:00:00Z' },
              updatedAt: { type: 'string', format: 'date-time', example: '2023-09-17T10:00:00Z' }
            }
          }
        },
        meta: {
          type: 'object',
          properties: {
            limit: { type: 'number', example: 10 },
            count: { type: 'number', example: 100 },
            hasNextPage: { type: 'boolean', example: true },
            nextCursor: { type: 'string', nullable: true, example: 'next-cursor-string' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Authentication required' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Admin role required',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Admin role required' }
      }
    }
  })
  @RolesRequired(Roles.ADMIN)
  @UseGuards(ClerkGuard, RolesGuard)
  @Get()
  findAllImages(@Query('limit', new DefaultValuePipe(10), ParseIntPipe) limit: number, @Query('cursor') cursor?: string, @Query('search') search?: string, @Query('status') status?: ImageStatus) {
    return this.imagesService.findAllImages(limit, cursor, search, status);
  }

  @ApiOperation({
    summary: 'Get image by ID',
    description: 'Retrieve a specific image by its ID'
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Image ID to retrieve',
    type: 'string',
    example: 'uuid-string'
  })
  @ApiResponse({
    status: 200,
    description: 'Image retrieved successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Image retrieved successfully' },
        data: {
          type: 'object',
          properties: {
            id: { type: 'string', example: 'uuid-string' },
            ownerId: { type: 'string', nullable: true, example: 'user-id-123' },
            processId: { type: 'string', example: 'process-uuid' },
            originalFileName: { type: 'string', example: 'image.jpg' },
            originalImageUrlLQ: { type: 'string', nullable: true, example: 'https://example.com/image-lq.jpg' },
            originalImageUrlHQ: { type: 'string', nullable: true, example: 'https://example.com/image-hq.jpg' },
            bgRemovedFileName: { type: 'string', nullable: true, example: 'processed-image.png' },
            bgRemovedImageUrlLQ: { type: 'string', nullable: true, example: 'https://example.com/processed-lq.png' },
            bgRemovedImageUrlHQ: { type: 'string', nullable: true, example: 'https://example.com/processed-hq.png' },
            status: { type: 'string', enum: ['queue', 'processing', 'ready'], example: 'ready' },
            createdAt: { type: 'string', format: 'date-time', example: '2023-09-17T10:00:00Z' },
            updatedAt: { type: 'string', format: 'date-time', example: '2023-09-17T10:00:00Z' }
          }
        }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Authentication required' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Image not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Image not found' },
        data: { type: 'null', example: null }
      }
    }
  })
  @UseGuards(ClerkGuard)
  @Get(':id')
  findImageById(@Param('id') id: string) {
    return this.imagesService.findImageById(id);
  }

  @ApiOperation({
    summary: 'Delete image',
    description: 'Delete an image from the system. Requires admin or moderator role with DELETE_IMAGES permission.'
  })
  @ApiBearerAuth()
  @ApiParam({
    name: 'id',
    description: 'Image ID to delete',
    type: 'string',
    example: 'uuid-string'
  })
  @ApiResponse({
    status: 200,
    description: 'Image deleted successfully',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: true },
        message: { type: 'string', example: 'Image deleted successfully' },
        data: { type: 'boolean', example: true }
      }
    }
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Authentication required',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Authentication required' }
      }
    }
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - Insufficient permissions',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Admin or moderator role with DELETE_IMAGES permission required' }
      }
    }
  })
  @ApiResponse({
    status: 404,
    description: 'Image not found',
    schema: {
      type: 'object',
      properties: {
        success: { type: 'boolean', example: false },
        message: { type: 'string', example: 'Image not found' }
      }
    }
  })
  @RolesRequired(Roles.ADMIN || Roles.MODERATOR)
  @PermissionsRequired(Permissions.DELETE_IMAGES)
  @UseGuards(ClerkGuard, RolesGuard, PermissionsGuard)
  @Delete('delete/:id')
  deleteImage(@Param('id') id: string) {
    return this.imagesService.deleteImage(id);
  }

}
