import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Polar } from "@polar-sh/sdk";
import axios from "axios";
import { Job, Queue } from "bullmq";
import { createReadStream } from 'fs';
import * as fs from 'fs/promises';
import Redis from "ioredis";
import { NotificationGateway } from "src/notification/notification.gateway";
import { PrismaService } from "src/prisma/prisma.service";
import { REDIS_CLIENT } from "src/queue/queue.module";
import { ImageGateway } from "../image.gateway";
import FormData = require("form-data");

type PollImagePayload = { processId: string, userId: string, attempt?: number };

@Processor('image-processor', {
    concurrency: 2, // Reduced to prevent overwhelming the system
})
export class ImageProcessor extends WorkerHost {
    private readonly logger = new Logger(ImageProcessor.name);
    private readonly POLL_INTERVALS = [3000, 5000, 8000, 12000, 20000]; // Progressive intervals
    private readonly MAX_POLL_ATTEMPTS = 20; // Max polling attempts
    constructor(
        private readonly config: ConfigService,
        private readonly prisma: PrismaService,
        @InjectQueue('image-processor') private readonly imageProcessorQueue: Queue,
        private readonly imageSocket: ImageGateway,
        @Inject('POLAR_CLIENT') private readonly polarClient: Polar,
        private readonly notificationGateway: NotificationGateway,
        @Inject(REDIS_CLIENT) private readonly redisClient: Redis
    ) {
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
        const startTime = Date.now();
        this.logger.log(`Processing job ${job.name} with ID ${job.id}`);

        try {
            switch (job.name) {
                case 'process-image':
                    return await this.handleImageCreateOnDB(job);
                case 'poll-image':
                    return await this.handleImagePoll(job as Job<PollImagePayload>);
                default:
                    throw new Error(`Unknown job type: ${job.name}`);
            }
        } catch (error) {
            const duration = Date.now() - startTime;
            this.logger.error(`Job ${job.name} failed after ${duration}ms:`, {
                jobId: job.id,
                error: error.message,
                stack: error.stack
            });

            // Enhanced cleanup
            await this.cleanupTempFiles(job);
            throw error;
        } finally {
            const duration = Date.now() - startTime;
            this.logger.log(`Job ${job.name} completed in ${duration}ms`);
        }
    }

    // Enhanced file cleanup utility
    private async cleanupTempFiles(job: Job<any>): Promise<void> {
        if (job.name === 'process-image' && job.data.file?.tempFilePath) {
            try {
                await fs.access(job.data.file.tempFilePath);
                await fs.unlink(job.data.file.tempFilePath);
                this.logger.log(`Cleaned up temp file: ${job.data.file.tempFilePath}`);
            } catch (unlinkError: any) {
                if (unlinkError.code !== 'ENOENT') {
                    this.logger.warn(`Failed to cleanup temp file ${job.data.file.tempFilePath}:`, unlinkError.message);
                }
            }
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
        const { tempFilePath, originalname, mimetype, size } = job.data.file;

        // Verify file exists and get file stats
        let fileStats;
        try {
            await fs.access(tempFilePath);
            fileStats = await fs.stat(tempFilePath);
        } catch (error) {
            throw new Error(`Temp file not found or inaccessible: ${tempFilePath}`);
        }

        // Validate file size consistency
        if (fileStats.size !== size) {
            this.logger.warn(`File size mismatch: expected ${size}, got ${fileStats.size}`);
        }

        const formData = new FormData();
        const fileStream = createReadStream(tempFilePath);

        // Enhanced error handling for file stream
        fileStream.on('error', (error) => {
            this.logger.error(`File stream error for ${tempFilePath}:`, error);
        });

        formData.append('image', fileStream, {
            filename: originalname,
            contentType: mimetype,
            knownLength: fileStats.size // Improve upload efficiency
        });

        try {
            this.logger.log(`Uploading image ${originalname} (${(size / 1024 / 1024).toFixed(2)}MB) for processing`);

            const response = await axios.post(
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
            if (response.status >= 400) {
                throw new Error(`Image processing API error: ${response.status} - ${response.statusText}`);
            }

            this.logger.log(`Image processing initiated for ${originalname}`);
            return response.data;
        } catch (error: any) {
            this.logger.error(`Failed to process image ${originalname}:`, error.message);
            throw error;
        } finally {
            // Ensure file stream is closed and file is cleaned up
            fileStream.destroy();
            try {
                await fs.unlink(tempFilePath);
                this.logger.log(`Cleaned up temp file: ${tempFilePath}`);
            } catch (cleanupError: any) {
                this.logger.warn(`Cleanup failed for ${tempFilePath}:`, cleanupError.message);
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

    // Cached image status check with Redis
    async findImageByProcessId(processId: string): Promise<any> {
        const cacheKey = `image_status:${processId}`;

        // Check cache first
        try {
            const cached = await this.redisClient.get(cacheKey);
            if (cached) {
                const data = JSON.parse(cached);
                // Only use cache for non-ready states to ensure fresh data for completed images
                if (data.statusName !== 'ready') {
                    this.logger.debug(`Using cached status for ${processId}: ${data.statusName}`);
                    return { data };
                }
            }
        } catch (cacheError) {
            this.logger.warn(`Cache read failed for ${processId}:`, cacheError);
        }

        try {
            const response = await axios.get(
                `${this.config.get<string>('IMAGE_PROCESSOR_URL')}/process_image/${processId}`,
                {
                    params: { token: this.config.get<string>('IMAGE_PROCESSOR_API_KEY') },
                    timeout: 15000, // Reduced timeout for status checks
                }
            );

            // Cache the response for 30 seconds
            try {
                await this.redisClient.setex(cacheKey, 30, JSON.stringify(response.data));
            } catch (cacheError) {
                this.logger.warn(`Cache write failed for ${processId}:`, cacheError);
            }

            return response;
        } catch (error: any) {
            this.logger.error(`Failed to check status for ${processId}:`, error.message);
            throw error;
        }
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
        await this.prisma.image.create({
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

    async handleImagePoll(job: Job<{ processId: string, userId: string, attempt?: number }>): Promise<void> {
        const { processId, userId, attempt = 0 } = job.data;

        this.logger.log(`Polling image ${processId} (attempt ${attempt + 1}/${this.MAX_POLL_ATTEMPTS})`);

        const image = await this.prisma.image.findUnique({
            where: { processId },
            select: {
                id: true,
                processId: true,
                ownerId: true,
                originalFileName: true,
                status: true
            }
        });

        if (!image) {
            throw new Error(`Image not found for processId ${processId}`);
        }

        // Skip polling if image is already ready (race condition protection)
        if (image.status === 'ready') {
            this.logger.log(`Image ${processId} already marked as ready, skipping poll`);
            return;
        }

        try {
            const result = await this.findImageByProcessId(processId);

            if (result.data.statusName === 'ready') {
                await this.completeImageProcessing(image, result.data, userId);
            } else if (
                result.data.statusName === 'processing' ||
                result.data.statusName === 'queue'
            ) {
                if (attempt < this.MAX_POLL_ATTEMPTS) {
                    // Progressive delay - longer intervals for later attempts
                    const delayIndex = Math.min(attempt, this.POLL_INTERVALS.length - 1);
                    const delay = this.POLL_INTERVALS[delayIndex];

                    await this.imageProcessorQueue.add(
                        'poll-image',
                        { processId, userId, attempt: attempt + 1 },
                        {
                            delay,
                            priority: Math.max(1, 10 - attempt), // Lower priority for later attempts
                            removeOnComplete: 10,
                            removeOnFail: 3
                        }
                    );

                    this.logger.log(`Scheduled next poll for ${processId} in ${delay}ms`);
                } else {
                    this.logger.error(`Max polling attempts reached for ${processId}`);
                    // Mark as failed or handle timeout
                    await this.handlePollingTimeout(image, userId);
                }
            } else if (result.data.statusName === 'failed' || result.data.statusName === 'error') {
                this.logger.error(`Image processing failed for ${processId}: ${result.data.statusName}`);
                await this.handleProcessingFailure(image, result.data, userId);
            }
        } catch (error: any) {
            this.logger.error(`Polling failed for ${processId}:`, error.message);

            // Retry with exponential backoff on network errors
            if (attempt < this.MAX_POLL_ATTEMPTS && this.isRetryableError(error)) {
                const delay = Math.min(30000, 5000 * Math.pow(2, attempt)); // Max 30s delay
                await this.imageProcessorQueue.add(
                    'poll-image',
                    { processId, userId, attempt: attempt + 1 },
                    { delay, priority: 1 }
                );
                this.logger.log(`Retrying poll for ${processId} after error, attempt ${attempt + 1}`);
            } else {
                throw error;
            }
        }
    }

    // Helper method to complete image processing
    private async completeImageProcessing(image: any, resultData: any, userId: string): Promise<void> {
        this.logger.log(`Completing image processing for ${image.processId}`);

        // Check user subscription status
        let freeUser = true;
        if (image.ownerId) {
            let isPaid = await this.redisClient.get(`user:${image.ownerId}:is_paid`);
            if (isPaid === null) {
                try {
                    const customer = await this.polarClient.customers.getStateExternal({ externalId: image.ownerId });
                    isPaid = customer.activeSubscriptions?.[0]?.amount > 0 ? 'true' : 'false';
                    await this.redisClient.set(`user:${image.ownerId}:is_paid`, isPaid, 'EX', 600); // Cache for 10 minutes
                } catch (error) {
                    this.logger.warn(`Failed to check subscription for ${image.ownerId}:`, error);
                    isPaid = 'false'; // Default to free user on error
                }
            }
            freeUser = isPaid === 'false';
        }

        // Update image with processing results
        const updatedImage = await this.prisma.image.update({
            where: { id: image.id },
            data: {
                status: 'ready',
                originalImageUrlLQ: resultData.source?.thumb2x_url || null,
                bgRemovedFileName: `erazor_${image.id}.png`,
                ...(freeUser && { bgRemovedImageUrlLQ: resultData.processed?.thumb2x_url || null }),
                ...(!freeUser && { bgRemovedImageUrlHQ: resultData.processed?.url || null }),
            },
        });

        // Track usage analytics
        if (image.ownerId) {
            try {
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

                // Send completion notification
                await this.notificationGateway.sendNotification({
                    userId: image.ownerId,
                    type: 'INFO',
                    message: `Your image ${image.originalFileName} has been processed successfully.`,
                });
            } catch (error) {
                this.logger.warn(`Failed to send analytics/notification for ${image.ownerId}:`, error);
            }
        }

        // Send socket update
        const targetUserId = userId || image.ownerId;
        if (targetUserId) {
            this.imageSocket.sendImageUpdate(targetUserId, updatedImage);
            this.logger.log(`Sent SSE update for ${targetUserId}`);
        }

        // Clear cache
        await this.redisClient.del(`image_status:${image.processId}`);
    }

    // Handle polling timeout
    private async handlePollingTimeout(image: any, userId: string): Promise<void> {
        this.logger.error(`Polling timeout for image ${image.processId}`);

        // Update image status to indicate timeout
        await this.prisma.image.update({
            where: { id: image.id },
            data: { status: 'queue' } // Keep as queue for potential retry
        });

        // Notify user of timeout
        if (image.ownerId) {
            await this.notificationGateway.sendNotification({
                userId: image.ownerId,
                type: 'WARNING',
                message: `Processing of ${image.originalFileName} is taking longer than expected. Please try again later.`,
            });
        }
    }

    // Handle processing failure
    private async handleProcessingFailure(image: any, resultData: any, userId: string): Promise<void> {
        this.logger.error(`Processing failed for image ${image.processId}: ${resultData.statusName}`);

        // Update image status
        await this.prisma.image.update({
            where: { id: image.id },
            data: { status: 'queue' } // Reset to queue for potential retry
        });

        // Notify user of failure
        if (image.ownerId) {
            await this.notificationGateway.sendNotification({
                userId: image.ownerId,
                type: 'ALERT',
                message: `Failed to process ${image.originalFileName}. Please try uploading again.`,
            });
        }
    }

    // Check if error is retryable
    private isRetryableError(error: any): boolean {
        // Network errors, timeouts, and 5xx server errors are retryable
        return error.code === 'ECONNRESET' ||
            error.code === 'ENOTFOUND' ||
            error.code === 'ETIMEDOUT' ||
            (error.response && error.response.status >= 500);
    }
}
