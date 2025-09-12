import { BadRequestException, CanActivate, ExecutionContext, Inject, Injectable } from "@nestjs/common";
import { Polar } from "@polar-sh/sdk";

@Injectable()
export class FileSizeLimitGuard implements CanActivate {
    constructor(@Inject('POLAR_CLIENT') private readonly polarClient: Polar) { }
    async canActivate(context: ExecutionContext): Promise<boolean> {
        const req = context.switchToHttp().getRequest();
        const file = req.file;
        if (!file) return false;

        try {
            // Correct method call
            const customer = await this.polarClient.customers.getStateExternal({
                externalId: req.user.id,
            })
            // Check if customer has active subscriptions
            if (!customer.activeSubscriptions || customer.activeSubscriptions.length === 0) {
                throw new BadRequestException('Customer does not have an active subscription');
            }
            //find the correct product
            const product = await this.polarClient.products.get({
                id: customer.activeSubscriptions[0].productId
            })
            // Check if metadata exists and has file_size_limit
            if (!product.metadata?.file_size_limit) {
                throw new BadRequestException('File size limit not configured for this plan');
            }
            const MAX_FILE_SIZE = parseInt(product.metadata?.file_size_limit as string);
            if (file.size > MAX_FILE_SIZE) {
                throw new BadRequestException(`File size exceeds the limit of ${MAX_FILE_SIZE / (1024 * 1024)}MB.`);
            }
            return true;
        }
        catch (err) {
            if (err instanceof BadRequestException) {
                throw err;
            }
            throw new BadRequestException('Failed to validate file size limit');
        }
    }
}