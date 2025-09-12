import { CanActivate, ExecutionContext, Inject, Injectable, Type } from "@nestjs/common";
import type { Request } from 'express';
import Redis from "ioredis";
import { REDIS_CLIENT } from "src/queue/queue.module";
export const RateLimitGuard = (limit = 10, ttl = 60): Type<CanActivate> => {
    @Injectable()
    class RateLimitGuard implements CanActivate {
        constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) {
        }

        async canActivate(ctx: ExecutionContext): Promise<boolean> {
            const req = ctx.switchToHttp().getRequest<Request>();
            const ip = req.ip
            // Use a combination of IP address and current minute as the key
            const key = `rate-limit:${ip}`;
            const current = await this.redisClient.incr(key);
            if (current === 1) {
                // Set the expiration time for the key when it's first created
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