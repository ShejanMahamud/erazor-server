import type { ArgumentsHost } from '@nestjs/common';
import {
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    @SentryExceptionCaptured()
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        // Default response
        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();

            const responseMessage = (res as { message: string | string[] }).message;
            message =
                typeof res === 'string'
                    ? res
                    : Array.isArray(responseMessage)
                        ? responseMessage.join(', ')
                        : responseMessage || message;
        } else if (exception instanceof Error) {
            // Regular JS error (not HttpException)
            message = exception.message;
        }

        response.status(status).json({
            success: false,
            statusCode: status,
            path: request.url,
            timestamp: new Date().toISOString(),
            message,
        });
    }
}
