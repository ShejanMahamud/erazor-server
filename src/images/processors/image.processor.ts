import { InjectQueue, Processor, WorkerHost } from "@nestjs/bullmq";
import { Inject } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Polar } from "@polar-sh/sdk";
import axios from "axios";
import { Job } from "bullmq";
import { PrismaService } from "src/prisma/prisma.service";
import { ImageGateway } from "../image.gateway";
import FormData = require("form-data");
type PollImagePayload = { processId: string };
@Processor('image-processor')
export class ImageProcessor extends WorkerHost {
    constructor(private readonly config: ConfigService, private readonly prisma: PrismaService, @InjectQueue('image-processor') private readonly imageProcessorQueue, private readonly imageGateway: ImageGateway, @Inject('POLAR_CLIENT') private readonly polarClient: Polar) {
        super();
    }

    async process(job: Job<{
        userId: string;
        file: {
            originalname: string;
            mimetype: string;
            size: number;
            buffer: string;
            filename?: string;
        };
        processId?: string
    }>): Promise<any> {
        switch (job.name) {
            case 'process-image':
                await this.handleImageCreateOnDB(job);
                break;
            case 'poll-image':
                await this.handleImagePoll(job as Job<PollImagePayload>);
                break;
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
            buffer: string;
            filename?: string;
        };
    }>): Promise<any> {
        const fileBuffer = Buffer.from(job.data.file.buffer, 'base64');

        const formData = new FormData();
        formData.append('image', fileBuffer, {
            filename: job.data.file.originalname,
            contentType: job.data.file.mimetype
        });

        const { data } = await axios.post(
            `${this.config.get<string>('IMAGE_PROCESSOR_URL')}/process_image?token=${this.config.get<string>('IMAGE_PROCESSOR_API_KEY')}`,
            formData,
            {
                headers: {
                    ...formData.getHeaders(),
                }
            }
        );
        return data
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
            buffer: string;
            filename?: string;
        };
    }>): Promise<void> {
        const data = await this.handleImageProcessing(job);
        const user = await this.findUserById(job.data.userId);
        await this.prisma.image.create({
            data: {
                userId: job.data.userId,
                processId: data.id,
                originalFileName: job.data.file.originalname,
                status: data.statusName,
                originalImageUrlHQ: data.source.url,
            }
        });
        await this.imageProcessorQueue.add('poll-image', {
            processId: data.id
        }, {
            delay: 5000
        });
    }

    async handleImagePoll(job: Job<{ processId: string }>): Promise<void> {
        const image = await this.prisma.image.findUnique({
            where: { processId: job.data.processId },
        });

        if (!image) {
            throw new Error(`Image not found for processId ${job.data.processId}`);
        }

        const result = await this.findImageByProcessId(image.processId);

        if (result.data.statusName === 'ready') {
            const updatedImage = await this.prisma.image.update({
                where: { id: image.id },
                data: {
                    status: 'ready',
                    originalImageUrlLQ: result.data.source?.thumb2x_url || null,
                    bgRemovedFileName: `erazor_${result.data.fileName}.png`,
                    bgRemovedImageUrlHQ: result.data.processed?.url || null,
                    bgRemovedImageUrlLQ: result.data.processed?.thumb2x_url || null,
                },
            });
            await this.polarClient.events.ingest({
                events: [{
                    name: "bg_remove",
                    externalCustomerId: image.userId,
                    metadata: {
                        operations: 1,
                        image_id: updatedImage.processId,
                        timestamp: new Date().toISOString()
                    }
                }]
            });
            this.imageGateway.sendImageUpdate(updatedImage.userId, updatedImage);
        } else if (
            result.data.statusName === 'processing' ||
            result.data.statusName === 'queue'
        ) {
            await this.imageProcessorQueue.add(
                'poll-image',
                { processId: image.processId },
                { delay: 5000 }
            );
        }
    }

}