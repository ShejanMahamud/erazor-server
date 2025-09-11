import { InjectQueue } from '@nestjs/bullmq';
import { Injectable, Logger, NotFoundException } from '@nestjs/common';
import { Queue } from 'bullmq';
import { ImageStatus } from 'generated/prisma';
import { BillingService } from 'src/billing/billing.service';
import { PrismaService } from 'src/prisma/prisma.service';
import { IGlobalRes } from 'src/types';
import { IImage, IImageService } from './interfaces/images.interface';

@Injectable()
export class ImagesService implements IImageService {
  private readonly logger = new Logger(ImagesService.name);
  constructor(@InjectQueue('image-processor') private readonly imageProcessorQueue: Queue, private readonly prisma: PrismaService, private readonly billing: BillingService) { }

  async processImage(userId: string, file: Express.Multer.File): Promise<IGlobalRes<null>> {
    this.logger.log(`Processing image for user ${userId}`);

    const serializableFile = {
      originalname: file.originalname,
      mimetype: file.mimetype,
      size: file.size,
      buffer: file.buffer.toString('base64'),
      filename: file.filename
    };
    this.logger.log(`Adding image processing job for user ${userId} to the queue`);

    await this.imageProcessorQueue.add('process-image', {
      userId,
      file: serializableFile
    });
    this.logger.log(`Image processing job for user ${userId} added to the queue`);

    return {
      success: true,
      message: "Image processing started"
    }
  }

  async findAllImagesByUserId(userId: string, limit: number, cursor?: string, search?: string, status?: ImageStatus): Promise<IGlobalRes<IImage[]>> {
    this.logger.log(`Finding images for user ${userId} with limit ${limit} and cursor ${cursor}`);
    const images = await this.prisma.image.findMany({
      where: {
        userId,
        ...(status && {
          status: status
        }),
        ...(search && {
          originalFileName: {
            contains: search,
            mode: 'insensitive'
          }
        })
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    })
    this.logger.log(`Found ${images.length} images for user ${userId}`);
    return {
      success: true,
      message: "Images fetched successfully",
      data: images,
      meta: {
        limit,
        count: images.length,
        hasNextPage: images.length === limit,
        nextCursor: images.length === limit ? images[images.length - 1].id : null,
      }
    }
  }

  async findAllImages(limit: number, cursor?: string, search?: string, status?: ImageStatus): Promise<IGlobalRes<IImage[]>> {
    this.logger.log(`Finding images with limit ${limit} and cursor ${cursor}`);
    const images = await this.prisma.image.findMany({
      where: {
        ...(status && {
          status: status
        }),
        ...(search && {
          originalFileName: {
            contains: search,
            mode: 'insensitive'
          }
        })
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit,
      skip: cursor ? 1 : 0,
      cursor: cursor ? { id: cursor } : undefined,
    })
    this.logger.log(`Found ${images.length} images`);
    return {
      success: true,
      message: "Images fetched successfully",
      data: images,
      meta: {
        limit,
        count: images.length,
        hasNextPage: images.length === limit,
        nextCursor: images.length === limit ? images[images.length - 1].id : null,
      }
    }
  }

  async findImageById(id: string): Promise<IGlobalRes<IImage | null>> {
    this.logger.log(`Finding image with id ${id}`);
    const image = await this.prisma.image.findFirst({
      where: {
        OR: [
          { id },
          { processId: id }
        ]
      },
    });
    if (!image) {
      this.logger.warn(`Image with id ${id} not found`);
      throw new NotFoundException("Image not found");
    }
    this.logger.log(`Image with id ${id} found`);
    return {
      success: true,
      message: "Image fetched successfully",
      data: image
    };
  }

  async deleteImage(id: string): Promise<IGlobalRes<boolean>> {
    this.logger.log(`Deleting image with id ${id}`);
    const image = await this.prisma.image.findUnique({
      where: { id },
    });
    if (!image) {
      this.logger.warn(`Image with id ${id} not found`);
      throw new NotFoundException("Image not found");
    }
    await this.prisma.image.delete({
      where: { id },
    });
    this.logger.log(`Image with id ${id} deleted`);
    return {
      success: true,
      message: "Image deleted successfully",
      data: true
    };
  }
}
