import {
    CanActivate,
    ExecutionContext,
    Injectable,
    UnauthorizedException,
} from '@nestjs/common';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    private readonly validApiKey = process.env.APP_API_KEY;

    canActivate(context: ExecutionContext): boolean {
        const request = context.switchToHttp().getRequest();
        const apiKey =
            request.headers['x-api-key'];

        if (!apiKey || apiKey !== this.validApiKey) {
            throw new UnauthorizedException('Invalid API key');
        }
        return true;
    }
}
