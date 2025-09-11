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
        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:3000';
        const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

        // Create a Request-like object that Clerk expects
        const clerkRequest = {
            url: fullUrl,
            method: req.method,
            headers: req.headers,
        };
        const { token } = await this.clerkClient.authenticateRequest(
            clerkRequest as any,
        );
        console.log('Clerk Token:', token);
        if (!token) {
            return false;
        }
        const payload = await verifyToken(token, {
            secretKey: process.env.CLERK_SECRET_KEY,
        });
        const user = await this.clerkClient.users.getUser(payload.sub);
        req['user'] = { ...payload };
        req['token'] = token;
        return true;
    }
}
