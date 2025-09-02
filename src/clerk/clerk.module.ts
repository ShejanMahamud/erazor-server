import { createClerkClient } from '@clerk/backend';
import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Global()
@Module({
    providers: [
        {
            provide: 'CLERK_CLIENT',
            inject: [ConfigService],
            useFactory: (configService: ConfigService) => {
                return createClerkClient({
                    publishableKey: configService.get<string>('CLERK_PUBLISHABLE_KEY'),
                    secretKey: configService.get<string>('CLERK_SECRET_KEY'),
                });
            },
        },
    ],
    exports: ['CLERK_CLIENT'],
})
export class ClerkModule { }
