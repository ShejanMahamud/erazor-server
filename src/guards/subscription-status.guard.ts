import { BadRequestException, CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Polar } from "@polar-sh/sdk";
import Redis from "ioredis";
import { REDIS_CLIENT } from "src/queue/queue.module";

@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
    constructor(@Inject('POLAR_CLIENT') private readonly polarClient: Polar, @Inject(REDIS_CLIENT) private readonly redisClient: Redis) {

    }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user) return false;

        console.log('Checking subscription status for user:', user);

        if (user.sub.startsWith('anon-')) {
            return true;
        }
        if (user.freeUser) {
            return true;
        }
        try {
            //check redis cache first
            const cachedStatus = await this.redisClient.get(`user:${user.sub}:has_active_subscription`);
            if (cachedStatus) {
                return cachedStatus === 'true';
            }
            const { activeSubscriptions } = await this.polarClient.customers.getStateExternal({
                externalId: user.sub
            })
            if (!activeSubscriptions) return false;
            // cache the subscription status for 5 minutes
            await this.redisClient.set(`user:${user.sub}:has_active_subscription`, activeSubscriptions[0].status === 'active' ? 'true' : 'false', 'EX', 60 * 5);
            //save user isPaid or isFree
            await this.redisClient.set(`user:${user.sub}:is_paid`, activeSubscriptions[0].amount > 0 ? 'true' : 'false', 'EX', 60 * 5);
            return activeSubscriptions[0].status === 'active';


        }
        catch (err) {
            console.error('Polar API error in ActiveSubscriptionGuard:', err);
            throw new BadRequestException(`Failed to validate subscription status: ${err.message || err}`);
        }
    }
}