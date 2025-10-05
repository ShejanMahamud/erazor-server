import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    private readonly validApiKey = process.env.APP_API_KEY;
    constructor(private readonly reflector: Reflector) { }
    canActivate(context: ExecutionContext): boolean {
        const isPublic = this.reflector.get<boolean>('isPublic', context.getHandler());
        if (isPublic) return true;
        const request = context.switchToHttp().getRequest();
        const apiKey =
            request.headers['x-api-key'];

        if (!apiKey || apiKey !== this.validApiKey) {
            throw new UnauthorizedException('Invalid API key');
        }
        return true;
    }
}
