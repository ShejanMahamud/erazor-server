import { verifyToken, type ClerkClient } from '@clerk/backend';
import {
    CanActivate,
    ExecutionContext,
    Inject,
    Injectable,
    Logger,
} from '@nestjs/common';
import { createHash } from 'crypto';
import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class OptionalClerkGuard implements CanActivate {
    private readonly logger = new Logger(OptionalClerkGuard.name);

    constructor(
        @Inject('CLERK_CLIENT') private readonly clerkClient: ClerkClient,
    ) { }

    async canActivate(ctx: ExecutionContext): Promise<boolean> {
        const req = ctx.switchToHttp().getRequest<Request>();
        const res = ctx.switchToHttp().getResponse<Response>();

        // Build full URL for Clerk
        const protocol = req.protocol || 'http';
        const host = req.get('host') || 'localhost:3000';
        const fullUrl = `${protocol}://${host}${req.originalUrl || req.url}`;

        // Clerk expects a fetch-like request
        const clerkRequest = {
            url: fullUrl,
            method: req.method,
            headers: req.headers,
        };

        try {
            // Check if Authorization header exists first
            const authHeader = req.headers.authorization;
            if (!authHeader || !authHeader.startsWith('Bearer ')) {
                this.logger.debug('No valid authorization header found, using anonymous user');
                req['user'] = { sub: this.generateAnonymousId(req, res) };
                return true;
            }

            this.logger.debug('Attempting Clerk authentication...');

            // Authenticate with Clerk
            const { token } =
                await this.clerkClient.authenticateRequest(clerkRequest as any);

            if (token) {
                const payload = await verifyToken(token, {
                    secretKey: process.env.CLERK_SECRET_KEY,
                });
                req['user'] = { ...payload };
                this.logger.debug(`Clerk authentication successful for user: ${payload.sub}`);
                return true;
            } else {
                this.logger.warn('Clerk authentication returned no token, falling back to anonymous user');
            }
        } catch (err) {
            this.logger.error(`Clerk authentication failed: ${err.message}`, err.stack);
            this.logger.warn('Falling back to anonymous user due to authentication error');
        }

        // Fallback: Anonymous user
        req['user'] = { sub: this.generateAnonymousId(req, res) };
        return true;
    }

    private generateAnonymousId(req: Request, res: Response): string {
        // Check cookie first
        if (req.cookies['anon_id']) {
            return req.cookies['anon_id'];
        }

        // Otherwise generate new one
        let anonId: string;

        try {
            anonId = `anon-${uuidv4()}`;
        } catch {
            // Fallback if UUID fails
            const ip = (req.headers['x-forwarded-for'] as string) || req.ip || 'unknown-ip';
            const device = req.headers['user-agent'] || 'unknown-device';
            const rawId = `${ip}-${device}`;
            const hash = createHash('sha256').update(rawId).digest('hex').slice(0, 16);
            anonId = `anon-${hash}`;
        }

        // Persist via cookie
        res.cookie('anon_id', anonId, {
            httpOnly: true,
            maxAge: 365 * 24 * 60 * 60 * 1000,
            sameSite: 'lax',
            secure: process.env.NODE_ENV === 'production',
        });

        return anonId;
    }
}
