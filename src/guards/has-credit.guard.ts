import { CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Polar } from "@polar-sh/sdk";

@Injectable()
export class HasCreditGuard implements CanActivate {
    constructor(@Inject('POLAR_CLIENT') private readonly polarClient: Polar) {

    }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const user = req.user;
        if (!user) return false;

        const meter = await this.polarClient.customers.getStateExternal({
            externalId: user.id
        })
        if (!meter) return false;
        return meter.activeMeters.some(m => m.balance > 0 || m.creditedUnits > m.consumedUnits);
    }
}