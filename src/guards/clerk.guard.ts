import { verifyToken, type ClerkClient } from '@clerk/backend';
import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
} from '@nestjs/common';
import { type Request } from 'express';

@Injectable()
export class ClerkGuard implements CanActivate {
    constructor(
        @Inject('CLERK_CLIENT') private readonly clerkClient: ClerkClient,
    ) { }

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest<Request>();

        // Create a proper Request object with full URL for Clerk
        const protocol = req.protocol;
        const host = req.get('host');
        const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

        // Create a Request-like object that Clerk expects
        const clerkRequest = {
            url: fullUrl,
            method: req.method,
            headers: req.headers,
        };
        console.log('Clerk request:', clerkRequest);
        const { token } = await this.clerkClient.authenticateRequest(
            clerkRequest as any,
        );
        console.log('Clerk token:', token);
        if (!token) {
            return false;
        }
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        console.log('Clerk payload:', payload);
        req['user'] = { ...payload };
        return true;
    }
}
