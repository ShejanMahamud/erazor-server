import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, Type } from "@nestjs/common";
import type { Request } from 'express';
import Redis from "ioredis";
import { REDIS_CLIENT } from "src/queue/queue.module";
export const RateLimitGuard = (limit = 10, ttl = 60, freeDailyLimit = 3): Type<CanActivate> => {
    @Injectable()
    class RateLimitGuard implements CanActivate {
        constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {
        }

        async canActivate(ctx: ExecutionContext): Promise<boolean> {
            const req = ctx.switchToHttp().getRequest<Request>();
            const userId = req.user?.sub;
            const today = new Date().toISOString().slice(0, 10);
            const identifier = userId ?? req.ip;


            // Handle free users (both anonymous and authenticated) with hybrid tracking
            if (userId?.startsWith("anon-") || req.user?.freeUser) {
                const userAgent = req.headers['user-agent'] || '';
                const fingerprint = Buffer.from(`${userAgent}:${req.headers['accept-language'] || ''}:${req.headers['accept-encoding'] || ''}`).toString('base64').substring(0, 16);

                // For anonymous users: use IP + browser fingerprint
                // For authenticated free users: use userId as primary, IP as secondary check
                const primaryKey = userId?.startsWith("anon-")
                    ? `usage:free:${req.ip}:${fingerprint}:${today}`
                    : `usage:free:${userId}:${today}`;

                // Secondary check with IP for authenticated users (to detect account sharing)
                const secondaryKey = !userId?.startsWith("anon-")
                    ? `usage:free-ip:${req.ip}:${today}`
                    : null;

                // Check primary limit
                const primaryUsage = await this.redisClient.incr(primaryKey);
                if (primaryUsage === 1) {
                    await this.redisClient.expire(primaryKey, 86400); // expire in 24h
                }

                // Check secondary limit for authenticated users (IP-based)
                let secondaryUsage = 0;
                if (secondaryKey) {
                    secondaryUsage = await this.redisClient.incr(secondaryKey);
                    if (secondaryUsage === 1) {
                        await this.redisClient.expire(secondaryKey, 86400);
                    }
                }

                // Apply stricter limit - either per user or per IP
                const effectiveUsage = secondaryKey ? Math.max(primaryUsage, secondaryUsage) : primaryUsage;
                const effectiveLimit = secondaryKey ? Math.floor(freeDailyLimit * 1.5) : freeDailyLimit; // Slightly higher for auth users

                if (effectiveUsage > effectiveLimit) {
                    throw new ForbiddenException("USAGE_LIMIT_REACHED");
                }

                return true;
            }
            const routeKey = `${req.method}:${req.path}`;
            const key = `rate-limit:${identifier}:${routeKey}`;
            const current = await this.redisClient.incr(key);
            if (current === 1) {
                await this.redisClient.expire(key, ttl);
            }
            if (current > limit) {
                return false; // Rate limit exceeded
            }
            return true;
        }
    }
    return RateLimitGuard;
}