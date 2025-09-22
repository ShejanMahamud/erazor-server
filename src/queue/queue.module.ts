import { BullModule } from '@nestjs/bullmq';
import { Global, Module, Provider } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

// Define a unique token for the Redis client
export const REDIS_CLIENT = 'REDIS_CLIENT';

// BullMQ-specific Redis configuration
const getBullMQRedisConfig = (config: ConfigService) => ({
    host: config.get<string>('REDIS_HOST') as string,
    password: config.get<string>('REDIS_PASSWORD') as string,
    port: config.get<number>('REDIS_PORT') as number,
    maxRetriesPerRequest: null, // Required by BullMQ
    retryDelayOnFailover: 100,
    lazyConnect: false, // Connect immediately
    keepAlive: 30000,
    family: 4,
    db: 0,
    connectTimeout: 10000,
});

// General Redis configuration for application use
const getRedisConfig = (config: ConfigService) => ({
    host: config.get<string>('REDIS_HOST') as string,
    password: config.get<string>('REDIS_PASSWORD') as string,
    port: config.get<number>('REDIS_PORT') as number,
    maxRetriesPerRequest: 3, // For general Redis operations
    retryDelayOnFailover: 100,
    lazyConnect: false, // Connect immediately
    keepAlive: 30000,
    family: 4,
    db: 0,
    enableOfflineQueue: true, // Enable offline queue for resilience
    maxLoadingTimeout: 10000, // Increased timeout
    connectTimeout: 10000,
});

// Custom provider to create a Redis client using the centralized config
const redisClientProvider: Provider = {
    provide: REDIS_CLIENT,
    inject: [ConfigService],
    useFactory: (config: ConfigService) => {
        const redis = new Redis(getRedisConfig(config));

        redis.on('connect', () => {
            console.log('✅ Redis connected successfully');
        });

        redis.on('error', (err) => {
            console.error('❌ Redis connection error:', err.message);
        });

        redis.on('reconnecting', (time) => {
            console.log(`🔄 Redis reconnecting in ${time}ms`);
        });

        redis.on('ready', () => {
            console.log('✅ Redis ready for commands');
        });

        return redis;
    },
}; @Global()
@Module({
    imports: [
        BullModule.forRootAsync({
            inject: [ConfigService],
            useFactory: (config: ConfigService) => ({
                connection: getBullMQRedisConfig(config), // Use BullMQ-specific config
            }),
        }),
        BullModule.registerQueue(
            {
                name: 'image-processor',
                defaultJobOptions: {
                    removeOnComplete: {
                        age: 3600, // 1 hour
                        count: 200, // Keep more completed jobs for monitoring
                    },
                    removeOnFail: {
                        age: 86400, // 24 hours
                        count: 100, // Keep more failed jobs for debugging
                    },
                    attempts: 5, // Increased attempts for image processing
                    backoff: {
                        delay: 5000,
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