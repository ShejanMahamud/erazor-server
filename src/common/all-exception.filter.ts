import type { ArgumentsHost } from '@nestjs/common';
import {
    Catch,
    ExceptionFilter,
    HttpException,
    HttpStatus,
} from '@nestjs/common';
import { SentryExceptionCaptured } from '@sentry/nestjs';
import type { FastifyReply, FastifyRequest } from 'fastify';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
    @SentryExceptionCaptured()
    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<FastifyReply>();
        const request = ctx.getRequest<FastifyRequest>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let payload: any = {
            success: false,
            statusCode: status,
            message: 'Internal server error',
        };

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();

            if (typeof res === 'string') {
                payload.message = res;
                payload.statusCode = status;
            } else if (typeof res === 'object') {
                payload = { ...res, statusCode: status };
            }
        } else if (exception instanceof Error) {
            payload.message = exception.message;
        }

        response.status(status).send({
            ...payload,
            path: request.url,
            timestamp: new Date().toISOString(),
        });
    }
}
