import { Injectable, LoggerService, LogLevel } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface LogContext {
    userId?: string;
    requestId?: string;
    method?: string;
    url?: string;
    ip?: string;
    userAgent?: string;
    [key: string]: any;
}

@Injectable()
export class CustomLoggerService implements LoggerService {
    private readonly logLevels: LogLevel[] = [
        'error',
        'warn',
        'log',
        'debug',
        'verbose',
    ];
    private readonly currentLogLevel: LogLevel;
    private readonly isProduction: boolean;

    constructor(private readonly configService: ConfigService) {
        this.currentLogLevel =
            this.configService.get<LogLevel>('LOG_LEVEL') || 'log';
        this.isProduction =
            this.configService.get<string>('NODE_ENV') === 'production';
    }

    private shouldLog(level: LogLevel): boolean {
        const currentIndex = this.logLevels.indexOf(this.currentLogLevel);
        const messageIndex = this.logLevels.indexOf(level);
        return messageIndex <= currentIndex;
    }

    private formatMessage(
        level: LogLevel,
        message: string,
        context?: string,
        logContext?: LogContext,
    ): string {
        const timestamp = new Date().toISOString();
        const contextStr = context ? `[${context}]` : '';
        const levelStr = level.toUpperCase().padEnd(7);

        let formattedMessage = `${timestamp} [${levelStr}] ${contextStr} ${message}`;

        if (logContext && Object.keys(logContext).length > 0) {
            const contextDetails = Object.entries(logContext)
                .filter(([_, value]) => value !== undefined && value !== null)
                .map(([key, value]) => `${key}=${value}`)
                .join(' ');

            if (contextDetails) {
                formattedMessage += ` | ${contextDetails}`;
            }
        }

        return formattedMessage;
    }

    private writeLog(
        level: LogLevel,
        message: string,
        context?: string,
        logContext?: LogContext,
    ): void {
        if (!this.shouldLog(level)) return;

        const formattedMessage = this.formatMessage(
            level,
            message,
            context,
            logContext,
        );

        // In production, you might want to send logs to external services
        // For now, we'll use console methods
        switch (level) {
            case 'error':
                console.error(formattedMessage);
                break;
            case 'warn':
                console.warn(formattedMessage);
                break;
            case 'debug':
                console.debug(formattedMessage);
                break;
            case 'verbose':
                console.log(`[VERBOSE] ${formattedMessage}`);
                break;
            default:
                console.log(formattedMessage);
        }
    }

    log(message: string, context?: string, logContext?: LogContext): void {
        this.writeLog('log', message, context, logContext);
    }

    error(
        message: string,
        trace?: string,
        context?: string,
        logContext?: LogContext,
    ): void {
        const errorMessage = trace ? `${message}\n${trace}` : message;
        this.writeLog('error', errorMessage, context, logContext);
    }

    warn(message: string, context?: string, logContext?: LogContext): void {
        this.writeLog('warn', message, context, logContext);
    }

    debug(message: string, context?: string, logContext?: LogContext): void {
        this.writeLog('debug', message, context, logContext);
    }

    verbose(message: string, context?: string, logContext?: LogContext): void {
        this.writeLog('verbose', message, context, logContext);
    }

    // Convenience methods for common logging scenarios
    logRequest(
        method: string,
        url: string,
        statusCode: number,
        responseTime: number,
        logContext?: LogContext,
    ): void {
        const message = `${method} ${url} ${statusCode} - ${responseTime}ms`;
        this.log(message, 'HTTP', {
            ...logContext,
            method,
            url,
            statusCode,
            responseTime,
        });
    }

    logError(error: Error, context?: string, logContext?: LogContext): void {
        this.error(error.message, error.stack, context, logContext);
    }

    logUserAction(
        action: string,
        userId: string,
        details?: any,
        logContext?: LogContext,
    ): void {
        const message = `User action: ${action}`;
        this.log(message, 'UserAction', {
            ...logContext,
            userId,
            action,
            details: details ? JSON.stringify(details) : undefined,
        });
    }

    logDatabaseOperation(
        operation: string,
        table: string,
        duration?: number,
        logContext?: LogContext,
    ): void {
        const message = duration
            ? `Database ${operation} on ${table} completed in ${duration}ms`
            : `Database ${operation} on ${table}`;
        this.debug(message, 'Database', {
            ...logContext,
            operation,
            table,
            duration,
        });
    }

    logAuth(
        event: string,
        userId?: string,
        details?: any,
        logContext?: LogContext,
    ): void {
        const message = `Auth event: ${event}`;
        this.log(message, 'Auth', {
            ...logContext,
            userId,
            event,
            details: details ? JSON.stringify(details) : undefined,
        });
    }

    logQueue(
        jobName: string,
        event: string,
        jobId?: string,
        logContext?: LogContext,
    ): void {
        const message = `Queue job ${jobName}: ${event}`;
        this.log(message, 'Queue', { ...logContext, jobName, event, jobId });
    }
}