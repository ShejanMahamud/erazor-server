import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

@Injectable()
export class RolesGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredRoles = this.reflector.get<string[]>('roles', context.getHandler());
        if (!requiredRoles) return true;

        const req = context.switchToHttp().getRequest();
        const user = req.user;
        console.log('User in RolesGuard:', user.metadata.role);

        if (!user || !requiredRoles.includes(user.metadata.role)) {
            throw new ForbiddenException('Insufficient role');
        }

        return true;
    }
}
