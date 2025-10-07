import {
    ArgumentsHost,
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { Request, Response } from 'express';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    catch(exception: any, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        const status =
            exception instanceof HttpException
                ? exception.getStatus()
                : HttpStatus.INTERNAL_SERVER_ERROR;

        const errorResponse =
            exception instanceof HttpException
                ? exception.getResponse()
                : { message: exception.message };

        // ✅ If this is already a structured JSON (like from RateLimitGuard)
        if (
            errorResponse &&
            typeof errorResponse === 'object' &&
            'success' in errorResponse
        ) {
            return response.status(status).json(errorResponse);
        }

        // --- otherwise, build the normal fallback ---
        let message: string;
        let errors:
            | { field: string | null; message: string }[]
            | undefined;

        if (typeof errorResponse === 'string') {
            message = errorResponse;
        } else if (
            errorResponse !== null &&
            typeof errorResponse === 'object'
        ) {
            if ('message' in errorResponse) {
                const msg = (errorResponse as any).message;
                if (Array.isArray(msg)) {
                    errors = msg.map((m: string) => ({ field: null, message: m }));
                    message = 'Validation failed';
                } else if (typeof msg === 'string') {
                    message = msg;
                } else {
                    message = exception.message || 'Internal Server Error';
                }
            } else if (
                'error' in errorResponse &&
                typeof (errorResponse as any).error === 'string'
            ) {
                message = (errorResponse as any).error;
            } else {
                message = exception.message || 'Internal Server Error';
            }
        } else {
            message = exception.message || 'Internal Server Error';
        }

        response.status(status).json({
            success: false,
            message,
            errors,
            meta: {
                statusCode: status,
                timestamp: new Date().toISOString(),
                path: request.originalUrl || request.url,
            },
        });
    }
}
