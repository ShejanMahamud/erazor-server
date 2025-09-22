import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from 'generated/prisma';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);

    constructor() {
        super({
            datasources: {
                db: {
                    url: process.env.DATABASE_URL,
                },
            },
            log: process.env.NODE_ENV === 'production'
                ? ['error', 'warn']
                : ['query', 'info', 'warn', 'error'],
            errorFormat: process.env.NODE_ENV === 'production' ? 'minimal' : 'pretty',
        });
    }

    async onModuleInit() {
        await this.$connect();
        this.logger.log('✅ Database connected successfully');

        // Note: $use middleware is not available in this Prisma version
        // Slow query monitoring should be handled at the database level or through logging
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    // Performance monitoring wrapper for critical queries
    async executeWithMonitoring<T>(
        operation: () => Promise<T>,
        operationName: string
    ): Promise<T> {
        const start = performance.now();
        try {
            const result = await operation();
            const duration = performance.now() - start;

            if (duration > 1000) {
                this.logger.warn(
                    `⚠️ Slow query: ${operationName} took ${duration.toFixed(2)}ms`
                );
            } else if (duration > 500) {
                this.logger.log(
                    `📊 Query: ${operationName} took ${duration.toFixed(2)}ms`
                );
            }

            return result;
        } catch (error) {
            const duration = performance.now() - start;
            this.logger.error(
                `❌ Failed query: ${operationName} failed after ${duration.toFixed(2)}ms`,
                error
            );
            throw error;
        }
    }
}
