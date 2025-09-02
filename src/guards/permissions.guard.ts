import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { ROLE_PERMISSIONS } from "src/users/helpers/role-permissions.map";

@Injectable()
export class PermissionsGuard implements CanActivate {
    constructor(private reflector: Reflector) { }

    canActivate(context: ExecutionContext): boolean {
        const requiredPermissions = this.reflector.get<string[]>('permissions', context.getHandler());
        if (!requiredPermissions) return true;

        const req = context.switchToHttp().getRequest();
        const user = req.user;
        const hasPermission = ROLE_PERMISSIONS[user.role].includes(requiredPermissions);

        if (!user || !hasPermission) {
            throw new ForbiddenException('Insufficient permissions');
        }

        return true;
    }
}
