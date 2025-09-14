export { };

declare global {
    interface CustomJwtSessionClaims {
        metadata: {
            role?: Roles
        }
    }
    namespace Express {
        interface Request {
            user?: JwtPayload & {
                azp: string;
                exp: number;
                fva: [number, number];
                iat: number;
                iss: string;
                jti: string;
                metadata: { role: string };
                nbf: number;
                sid: string;
                sts: string;
                sub: string;
                v: number;
            };
        }
    }
}