import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Polar } from "@polar-sh/sdk";

@Injectable()
export class ActiveSubscriptionGuard implements CanActivate {
    constructor(@Inject('POLAR_CLIENT') private readonly polarClient: Polar) {

    }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user) return false;

        const { activeSubscriptions } = await this.polarClient.customers.getStateExternal({
            externalId: user.id
        })
        if (!activeSubscriptions) return false;
        return activeSubscriptions[0].status === 'active';
    }
}