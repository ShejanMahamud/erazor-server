import { CookieSerializeOptions } from '@fastify/cookie';
import 'fastify';
import { JwtPayload } from 'jsonwebtoken';

export interface CustomJwtSessionClaims {
    metadata: {
        role?: Roles;
    };
}

declare module 'fastify' {
    interface FastifyRequest {
        cookies: { [key: string]: string };
        user?: JwtPayload &
        CustomJwtSessionClaims & {
            azp: string;
            exp: number;
            fva: [number, number];
            iat: number;
            iss: string;
            jti: string;
            nbf: number;
            sid: string;
            sts: string;
            sub: string;
            v: number;
            isPaid?: boolean;
            freeUser?: boolean;
        };
    }

    interface FastifyReply {
        setCookie(
            name: string,
            value: string,
            options?: CookieSerializeOptions
        ): this;
    }
}