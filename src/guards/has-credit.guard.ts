import { BadRequestException, CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Polar } from "@polar-sh/sdk";
import Redis from "ioredis";
import { REDIS_CLIENT } from "src/queue/queue.module";

@Injectable()
export class HasCreditGuard implements CanActivate {
    constructor(@Inject('POLAR_CLIENT') private readonly polarClient: Polar, @Inject(REDIS_CLIENT) private readonly redisClient: Redis) {

    }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user) return false;
        try {
            // check redis cache first
            const cachedCredit = await this.redisClient.get(`user:${user.id}:has_credit`);
            if (cachedCredit) {
                return cachedCredit === 'true';
            }

            // Directly check from Polar without caching
            const meter = await this.polarClient.customers.getStateExternal({
                externalId: user.id
            })
            if (!meter) return false;
            // cache the credit status for 5 minutes
            await this.redisClient.set(`user:${user.id}:has_credit`, meter.activeMeters.some(m => m.balance > 0 || m.creditedUnits > m.consumedUnits) ? 'true' : 'false', 'EX', 60 * 5);
            return meter.activeMeters.some(m => m.balance > 0 || m.creditedUnits > m.consumedUnits);
        }
        catch (err) {
            throw new BadRequestException(err.message || 'Failed to validate credit status');
        }
    }
}