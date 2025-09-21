import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Polar } from "@polar-sh/sdk";
import axios from "axios";
import { Job } from "bullmq";
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import Redis from "ioredis";
import { NotificationGateway } from "src/notification/notification.gateway";
import { PrismaService } from "src/prisma/prisma.service";
import { REDIS_CLIENT } from "src/queue/queue.module";
import { ImageGateway } from "../image.gateway";
import FormData = require("form-data");
type PollImagePayload = { processId: string, userId: string };
@Processor('image-processor')
export class ImageProcessor extends WorkerHost {
    constructor(private readonly config: ConfigService, private readonly prisma: PrismaService, @InjectQueue('image-processor') private readonly imageProcessorQueue, private readonly imageGateway: ImageGateway, @Inject('POLAR_CLIENT') private readonly polarClient: Polar, private readonly notificationGateway: NotificationGateway, @Inject(REDIS_CLIENT) private readonly redisClient: Redis) {
        super();
    }

    async process(job: Job<{
        userId: string;
        file: {
            originalname: string;
            mimetype: string;
            size: number;
            tempFilePath: string;
            filename?: string;
        };
        processId?: string
    }>): Promise<any> {
        try {
            switch (job.name) {
                case 'process-image':
                    await this.handleImageCreateOnDB(job);
                    break;
                case 'poll-image':
                    await this.handleImagePoll(job as Job<PollImagePayload>);
                    break;
            }
        } catch (error) {
            // Clean up temp file if job fails and file still exists
            if (job.name === 'process-image' && job.data.file?.tempFilePath) {
                try {
                    // Check if file exists before trying to delete it
                    await fs.access(job.data.file.tempFilePath);
                    await fs.unlink(job.data.file.tempFilePath);
                } catch (unlinkError) {
                    // Only log error if it's not a "file not found" error
                    if (unlinkError.code !== 'ENOENT') {
                        console.error(`Failed to clean up temp file after job failure ${job.data.file.tempFilePath}:`, unlinkError);
                    }
                }
            }
            throw error;
        }
    }

    async findUserById(userId: string): Promise<any> {
        return this.prisma.user.findUnique({
            where: {
                id: userId
            }
        });
    }

    async handleImageProcessing(job: Job<{
        file: {
            originalname: string;
            mimetype: string;
            size: number;
            tempFilePath: string;
            filename?: string;
        };
    }>): Promise<any> {
        // Check if temp file exists
        try {
            await fs.access(job.data.file.tempFilePath);
        } catch (error) {
            throw new Error(`Temp file not found: ${job.data.file.tempFilePath}`);
        }

        const formData = new FormData();

        // Create a read stream from the temp file
        const fileStream = createReadStream(job.data.file.tempFilePath);

        formData.append('image', fileStream, {
            filename: job.data.file.originalname,
            contentType: job.data.file.mimetype
        });

        try {
            const { data } = await axios.post(
                `${this.config.get<string>('IMAGE_PROCESSOR_URL')}/process_image?token=${this.config.get<string>('IMAGE_PROCESSOR_API_KEY')}`,
                formData,
                {
                    headers: {
                        ...formData.getHeaders(),
                    },
                    timeout: 60000,
                    maxContentLength: Infinity,
                    maxBodyLength: Infinity
                }
            );
            return data;
        } finally {
            // Clean up the temporary file after processing
            try {
                await fs.unlink(job.data.file.tempFilePath);
            } catch (error) {
                console.error(`Failed to delete temp file ${job.data.file.tempFilePath}:`, error);
            }
        }
    }

    async findAllQueuedImages(): Promise<any[]> {
        return this.prisma.image.findMany({
            where: {
                status: 'queue'
            }
        });
    }

    async findImageByProcessId(processId: string): Promise<any> {
        return axios.get(`${this.config.get<string>('IMAGE_PROCESSOR_URL')}/process_image/${processId}?token=${this.config.get<string>('IMAGE_PROCESSOR_API_KEY')}`);
    }

    async handleImageCreateOnDB(job: Job<{
        userId: string;
        file: {
            originalname: string;
            mimetype: string;
            size: number;
            tempFilePath: string;
            filename?: string;
        };
    }>): Promise<void> {
        const anonUser = job.data.userId.startsWith('anon-')
        const data = await this.handleImageProcessing(job);
        const image = await this.prisma.image.create({
            data: {
                ownerId: anonUser ? null : job.data.userId,
                processId: data.id,
                originalFileName: job.data.file.originalname,
                status: data.statusName,
                originalImageUrlHQ: data.source.url,
            }
        });
        if (!anonUser) {
            await this.notificationGateway.sendNotification({
                userId: job.data.userId,
                type: 'INFO',
                message: `Your image ${job.data.file.originalname} is being processed.`,
            })
        }
        await this.imageProcessorQueue.add('poll-image', {
            processId: data.id,
            userId: job.data.userId
        }, {
            priority: 1,
            delay: 5000
        });
    }

    async handleImagePoll(job: Job<{ processId: string, userId: string }>): Promise<void> {
        const image = await this.prisma.image.findUnique({
            where: { processId: job.data.processId },
        });
        if (!image) {
            throw new Error(`Image not found for processId ${job.data.processId}`);
        }

        const result = await this.findImageByProcessId(image.processId);
        let freeUser = true;
        if (image.ownerId) {
            let isPaid = await this.redisClient.get(`user:${image.ownerId}:is_paid`);
            if (isPaid === null) {
                const customer = await this.polarClient.customers.getStateExternal({ externalId: image.ownerId });
                isPaid = customer.activeSubscriptions?.[0]?.amount > 0 ? 'true' : 'false';
                await this.redisClient.set(`user:${image.ownerId}:is_paid`, isPaid, 'EX', 300);
            }
            freeUser = isPaid === 'false';
        }


        if (result.data.statusName === 'ready') {
            const updatedImage = await this.prisma.image.update({
                where: { id: image.id },
                data: {
                    status: 'ready',
                    originalImageUrlLQ: result.data.source?.thumb2x_url || null,
                    bgRemovedFileName: `erazor_${image.id}.png`,
                    ...(freeUser && { bgRemovedImageUrlLQ: result.data.processed?.thumb2x_url || null }),
                    ...(!freeUser && { bgRemovedImageUrlHQ: result.data.processed?.url || null }),
                },
            });
            if (image.ownerId) {
                await this.polarClient.events.ingest({
                    events: [{
                        name: "bg_remove",
                        externalCustomerId: image.ownerId,
                        metadata: {
                            operations: 1,
                            image_id: updatedImage.processId,
                            timestamp: new Date().toISOString()
                        }
                    }]
                });
                await this.notificationGateway.sendNotification({
                    userId: image.ownerId,
                    type: 'INFO',
                    message: `Your image ${image.originalFileName} is being processed.`,
                })
            }
            // Send WebSocket update - use job.data.userId for anonymous users, image.ownerId for registered users
            const targetUserId = job.data.userId || image.ownerId;
            if (targetUserId) {
                this.imageGateway.sendImageUpdate(targetUserId, updatedImage);
            } else {
                console.warn('No valid userId found for WebSocket update. Job userId:', job.data.userId, 'Image ownerId:', image.ownerId);
            }
        } else if (
            result.data.statusName === 'processing' ||
            result.data.statusName === 'queue'
        ) {
            await this.imageProcessorQueue.add(
                'poll-image',
                { processId: image.processId, userId: job.data.userId },
                { delay: 5000, priority: 1 }
            );
        }
    }



}