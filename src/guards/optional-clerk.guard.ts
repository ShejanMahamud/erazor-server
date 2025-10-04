import { verifyToken, type ClerkClient } from '@clerk/backend';
import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Polar } from '@polar-sh/sdk';
import type { Request } from 'express';
import Redis from 'ioredis';

@Injectable()
export class OptionalClerkGuard implements CanActivate {
    private readonly logger = new Logger(OptionalClerkGuard.name);

    constructor(
        @Inject('CLERK_CLIENT') private readonly clerkClient: ClerkClient,
        @Inject('POLAR_CLIENT') private readonly polarClient: Polar,
        private readonly configService: ConfigService,
        @Inject('REDIS_CLIENT') private readonly redisClient: Redis,
    ) { }

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest<Request>();
        // Build full URL for Clerk
        const protocol = req.protocol;
        const host = req.get('host');
        const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

        // Clerk expects a fetch-like request
        const clerkRequest = {
            url: fullUrl,
            method: req.method,
            headers: req.headers,
        };
        const anonId = req.headers['anonymous-user']!;

        try {
            // Check if Authorization header exists first
            const authHeader = req.headers['authorization'];

            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                this.logger.debug('No valid authorization header found, using anonymous user');
                req['user'] = { sub: anonId };
                return true;
            }

            this.logger.debug('Attempting Clerk authentication...');

            // Authenticate with Clerk
            const { token } =
                await this.clerkClient.authenticateRequest(clerkRequest as any);

            if (token) {
                const payload = await verifyToken(token, {
                    secretKey: this.configService.get<string>('CLERK_SECRET_KEY') as string,
                });

                // Set user data first - this is the core authentication
                req['user'] = { ...payload };
                this.logger.debug(`Clerk authentication successful for user: ${payload.sub}`);
                //Get subscription status from redis first
                const cachedIsPaid = await this.redisClient.get(`user:${payload.sub}:is_paid`);
                if (cachedIsPaid) {
                    req['user']['isPaid'] = cachedIsPaid === 'true';
                    req['user']['freeUser'] = cachedIsPaid !== 'true';
                    return true;
                }
                // Try to get subscription info, but don't fail auth if it errors
                try {
                    const subscription = await this.polarClient.customers.getStateExternal({
                        externalId: payload.sub,
                    });
                    if (subscription.activeSubscriptions?.length) {
                        req['user']['isPaid'] = subscription.activeSubscriptions[0].amount > 0;
                        req['user']['freeUser'] = subscription.activeSubscriptions[0].amount === 0;
                        // Cache for 5 minutes
                        await this.redisClient.set(`user:${payload.sub}:is_paid`, req['user']['isPaid'] ? 'true' : 'false', 'EX', 300);
                    }
                } catch (subscriptionError) {
                    this.logger.warn(`Failed to fetch subscription data for user ${payload.sub}: ${subscriptionError.message}`);
                    // Default to free user if subscription check fails
                    req['user']['freeUser'] = true;
                }

                return true;
            } else {
                this.logger.warn('Clerk authentication returned no token, falling back to anonymous user');
            }
        } catch (err) {
            this.logger.error(`Clerk authentication failed: ${err.message}`, err.stack);
            this.logger.warn('Falling back to anonymous user due to authentication error');
        }

        // Fallback: Anonymous user
        req['user'] = { sub: anonId };
        return true;
    }
}
