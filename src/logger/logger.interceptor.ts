import {
    CallHandler,
    ExecutionContext,
    Injectable,
    NestInterceptor,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { Observable, tap } from 'rxjs';
import { CustomLoggerService, LogContext } from './logger.service';

@Injectable()
export class LoggerInterceptor implements NestInterceptor {
    constructor(private readonly logger: CustomLoggerService) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        if (context.getType() !== 'http') {
            return next.handle();
        }

        const request = context.switchToHttp().getRequest<Request>();
        const response = context.switchToHttp().getResponse<Response>();
        const startTime = Date.now();

        const logContext: LogContext = {
            requestId: this.generateRequestId(),
            method: request.method,
            url: request.url,
            ip: request.ip || request.connection.remoteAddress,
            userAgent: request.get('user-agent'),
        };

        // Log incoming request
        this.logger.log(
            `Incoming request: ${request.method} ${request.url}`,
            'HTTP',
            logContext,
        );

        return next.handle().pipe(
            tap({
                next: (data) => {
                    const duration = Date.now() - startTime;
                    this.logger.logRequest(
                        request.method,
                        request.url,
                        response.statusCode,
                        duration,
                        logContext,
                    );
                },
                error: (error) => {
                    const duration = Date.now() - startTime;
                    this.logger.error(
                        `Request failed: ${request.method} ${request.url} - ${error.message}`,
                        error.stack,
                        'HTTP',
                        { ...logContext, duration, statusCode: response.statusCode },
                    );
                },
            }),
        );
    }

    private generateRequestId(): string {
        return (
            Math.random().toString(36).substring(2, 15) +
            Math.random().toString(36).substring(2, 15)
        );
    }
}