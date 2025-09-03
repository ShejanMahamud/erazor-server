import { Global, Module } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Polar } from '@polar-sh/sdk';

@Global()
@Module({
    providers: [
        {
            provide: 'POLAR_CLIENT',
            useFactory: (config: ConfigService) => {
                return new Polar({
                    accessToken: config.get<string>('POLAR_ACCESS_TOKEN'),
                    server: 'sandbox',
                });
            },
            inject: [ConfigService],
        },
    ],
    exports: ['POLAR_CLIENT'],
})
export class PolarModule { }
