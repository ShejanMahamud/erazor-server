import { CanActivate, ExecutionContext, ForbiddenException, Inject, Injectable, Type } from "@nestjs/common";
import type { Request } from 'express';
import Redis from "ioredis";
import { REDIS_CLIENT } from "src/queue/queue.module";
export const RateLimitGuard = (limit = 10, ttl = 60, anonDailyLimit = 2): Type<CanActivate> => {
    @Injectable()
    class RateLimitGuard implements CanActivate {
        constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {
        }

        async canActivate(ctx: ExecutionContext): Promise<boolean> {
            const req = ctx.switchToHttp().getRequest<Request>();
            const userId = req.user?.sub;
            if (userId?.startsWith("anon-")) {
                const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
                const key = `usage:anon:${userId}:${today}`;
                const current = await this.redisClient.incr(key);

                if (current === 1) {
                    await this.redisClient.expire(key, 86400); // expire in 24h
                }

                if (current > anonDailyLimit) {
                    throw new ForbiddenException(
                        `Free limit reached (${anonDailyLimit} images/day). Please sign up to continue.`
                    );
                }

                return true;
            }
            const identifier = userId ?? req.ip;
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