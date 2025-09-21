import { BadRequestException, CallHandler, ExecutionContext, Inject, Injectable, NestInterceptor } from "@nestjs/common";
import { Polar } from "@polar-sh/sdk";
import Redis from "ioredis";
import { Observable } from "rxjs";
import { REDIS_CLIENT } from "src/queue/queue.module";

@Injectable()
export class FileSizeLimitInterceptor implements NestInterceptor {
    constructor(@Inject('POLAR_CLIENT') private readonly polarClient: Polar, @Inject(REDIS_CLIENT) private readonly redisClient: Redis) { }
    async intercept(context: ExecutionContext, next: CallHandler): Promise<Observable<any>> {
        const req = context.switchToHttp().getRequest();
        const file = req.file;

        if (!file) return next.handle();

        if (req.user?.sub?.startsWith('anon-') || req.user.freeUser) {
            const MAX_FILE_SIZE = 2;
            const sizeInMB = req.file.size / (1024 * 1024);
            if (sizeInMB > MAX_FILE_SIZE) {
                throw new BadRequestException(
                    `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
                );
            }
            return next.handle();
        }

        try {
            //check the customer max_upload_size if exists in redis cache
            const cachedLimit = await this.redisClient.get(`user:${req.user.sub}:file_size_limit`);
            if (cachedLimit) {
                const MAX_FILE_SIZE = parseInt(cachedLimit);
                const sizeInMB = req.file.size / (1024 * 1024);
                if (sizeInMB > MAX_FILE_SIZE) {
                    throw new BadRequestException(
                        `File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
                    );
                }
                return next.handle();
            }
            // Check if customer exists
            const customer = await this.polarClient.customers.getStateExternal({
                externalId: req.user.sub,
            })
            // Check if customer has active subscriptions
            if (!customer.activeSubscriptions || customer.activeSubscriptions.length === 0) {
                throw new BadRequestException('Customer does not have an active subscription');
            }
            //find the correct product
            const product = await this.polarClient.products.get({
                id: customer.activeSubscriptions[0].productId
            })
            // Check if metadata exists and has file_size_limit
            if (!product.metadata?.file_size_limit) {
                throw new BadRequestException('File size limit not configured for this plan');
            }
            const MAX_FILE_SIZE = parseInt(product.metadata?.file_size_limit as string);

            //set max_file_size in redis cache
            await this.redisClient.set(`user:${req.user.sub}:file_size_limit`, MAX_FILE_SIZE, 'EX', 60 * 5);
            const sizeInMB = req.file.size / (1024 * 1024);
            if (sizeInMB > MAX_FILE_SIZE) {
                throw new BadRequestException(`File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
            }

            return next.handle();
        }
        catch (err) {
            if (err instanceof BadRequestException) {
                throw err;
            }
            throw new BadRequestException('Failed to validate file size limit');
        }
    }
}