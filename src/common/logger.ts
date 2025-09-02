import { LoggerService } from '@nestjs/common';

export class CustomLogger implements LoggerService {
    log(message: any, context?: string) {
        // Implement your custom logging logic here
        console.log(`[LOG] ${context ? `[${context}] ` : ''}${message}`);
    }
    error(message: any, trace?: string, context?: string) {
        console.error(`[ERROR] ${context ? `[${context}] ` : ''}${message}`);
    }
    warn(message: any, context?: string) {
        console.warn(`[WARN] ${context ? `[${context}] ` : ''}${message}`);
    }
    debug(message: any, context?: string) {
        console.debug(`[DEBUG] ${context ? `[${context}] ` : ''}${message}`);
    }
    verbose(message: any, context?: string) {
        console.log(`[VERBOSE] ${context ? `[${context}] ` : ''}${message}`);
    }
}