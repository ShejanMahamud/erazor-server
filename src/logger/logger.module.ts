import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { LoggerInterceptor } from './logger.interceptor';
import { CustomLoggerService } from './logger.service';

@Global()
@Module({
    imports: [ConfigModule],
    providers: [CustomLoggerService, LoggerInterceptor],
    exports: [CustomLoggerService, LoggerInterceptor],
})
export class LoggerModule { }