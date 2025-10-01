import {
    CanActivate,
    ExecutionContext,
    HttpException,
    HttpStatus,
    Inject,
    Injectable,
    Type,
} from "@nestjs/common";
import { createHash } from "crypto";
import type { FastifyReply, FastifyRequest } from "fastify";
import Redis from "ioredis";
import { REDIS_CLIENT } from "src/queue/queue.module";

export const RateLimitGuard = (
    limit = 10, // per-route burst limit
    ttl = 60, // per-route window seconds
    freeDailyLimit = 3 // free user daily limit
): Type<CanActivate> => {
    @Injectable()
    class RateLimitGuard implements CanActivate {
        constructor(@Inject(REDIS_CLIENT) private readonly redisClient: Redis) { }

        async canActivate(ctx: ExecutionContext): Promise<boolean> {
            const req = ctx.switchToHttp().getRequest<FastifyRequest>();
            const res = ctx.switchToHttp().getResponse<FastifyReply>();

            const userId = req?.user?.sub;
            const today = new Date().toISOString().slice(0, 10);

            if (req.user?.paidUser) return true;

            const userAgent = req.headers["user-agent"] || "";
            const fingerprint = createHash("sha256")
                .update(
                    `${userAgent}|${req.headers["accept-language"] || ""}|${req.headers["accept-encoding"] || ""
                    }`
                )
                .digest("hex")
                .slice(0, 16);

            const anonKey = `usage:free:${req.ip}:${fingerprint}:${today}`;
            const userKey = userId && req.user?.freeUser ? `usage:free:${userId}:${today}` : null;

            let effectiveUsage = 0;

            if (userKey) {
                await this.redisClient.eval(
                    `
          local a = redis.call("GET", KEYS[1])
          if a then
            redis.call("DEL", KEYS[1])
            redis.call("INCRBY", KEYS[2], tonumber(a))
          end
          return 1
        `,
                    2,
                    anonKey,
                    userKey
                );

                const usage = await this.redisClient.incr(userKey);
                if (usage === 1) await this.redisClient.expire(userKey, 86400);
                effectiveUsage = usage;
            } else {
                // ✅ Pure anon
                const usage = await this.redisClient.incr(anonKey);
                if (usage === 1) await this.redisClient.expire(anonKey, 86400);
                effectiveUsage = usage;
            }

            if (effectiveUsage > freeDailyLimit) {
                res.header("Retry-After", 86400);
                res.header("X-RateLimit-Limit", freeDailyLimit);
                res.header("X-RateLimit-Remaining", Math.max(0, freeDailyLimit - effectiveUsage));

                throw new HttpException(
                    {
                        success: false,
                        message: "USAGE_LIMIT_EXCEEDED",
                        meta: {
                            statusCode: 429,
                            timestamp: new Date().toISOString(),
                            path: req.url
                        },
                    },
                    HttpStatus.TOO_MANY_REQUESTS
                );
            }

            const routeKey = `${req.method}:${req.url}`;
            const identifier = userId ?? req.ip;
            const rateKey = `rate-limit:${identifier}:${routeKey}`;

            const current = await this.redisClient.incr(rateKey);
            if (current === 1) await this.redisClient.expire(rateKey, ttl);

            if (current > limit) {
                res.header("Retry-After", ttl);
                res.header("X-RateLimit-Limit", limit);
                res.header("X-RateLimit-Remaining", Math.max(0, limit - current));

                throw new HttpException(
                    {
                        success: false,
                        message: "TOO_MANY_REQUESTS",
                        meta: {
                            statusCode: 429,
                            timestamp: new Date().toISOString(),
                            path: req.url,
                        },
                    },
                    HttpStatus.TOO_MANY_REQUESTS
                );
            }

            return true;
        }
    }

    return RateLimitGuard;
};
