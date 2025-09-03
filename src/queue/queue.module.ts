import { BullModule } from '@nestjs/bullmq';
import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Define a unique token for the Redis client
export const REDIS_CLIENT = 'REDIS_CLIENT';

// Centralized Redis configuration function
const getRedisConfig = (config: ConfigService) => ({
    host: config.get<string>('REDIS_HOST') as string,
    password: config.get<string>('REDIS_PASSWORD') as string,
    port: config.get<number>('REDIS_PORT') as number,
});

// Custom provider to create a Redis client using the centralized config
const redisClientProvider: Provider = {
    provide: REDIS_CLIENT,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
        return new Redis(getRedisConfig(config));
    },
};

@Global()
@Module({
    imports: [
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: getRedisConfig(config),
            }),
        }),
        BullModule.registerQueue(
            {
                name: 'image-processor',
                defaultJobOptions: {
                    removeOnComplete: {
                        age: 3600,
                        count: 1000,
                    },
                    removeOnFail: {
                        age: 86400,
                        count: 100,
                    },
                    attempts: 3,
                    backoff: {
                        delay: 3000,
                        type: 'exponential',
                    },
                },
            },
        ),
    ],
    providers: [redisClientProvider],
    exports: [BullModule, REDIS_CLIENT],
})
export class QueueModule { }