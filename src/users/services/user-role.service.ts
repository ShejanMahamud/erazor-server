import { Injectable, NotFoundException } from "@nestjs/common";
import { Permissions, Roles } from "generated/prisma";
import { PrismaService } from "src/prisma/prisma.service";
import { IGlobalRes } from "src/types";
import { ROLE_PERMISSIONS } from "../helpers/role-permissions.map";
import { IUserRole, IUserRoleService } from "../interfaces/user-role.interface";

@Injectable()
export class UserRoleService implements IUserRoleService {

    constructor(private readonly prisma: PrismaService) { }

    async assignRoleToUser(role: Roles, userId: string): Promise<IGlobalRes<IUserRole>> {
        const data = await this.prisma.userRole.create({
            data: {
                role,
                userId
            }
        });
        return { success: true, message: "Role assigned successfully", data };
    }

    async getUserRole(userId: string): Promise<IGlobalRes<IUserRole>> {
        const data = await this.prisma.userRole.findFirst({
            where: { userId, status: true }
        });
        if (!data) {
            throw new NotFoundException("User role not found");
        }
        return { success: true, message: "User role retrieved successfully", data };
    }

    async userHasPermission(userId: string, permission: Permissions): Promise<IGlobalRes<boolean>> {
        const userRole = await this.prisma.userRole.findFirst({
            where: { userId, status: true },
            select: { role: true }
        });
        if (!userRole) {
            throw new NotFoundException("User role not found");
        }
        const hasPermission = ROLE_PERMISSIONS[userRole.role].includes(permission);
        return { success: true, message: "User permission checked successfully", data: hasPermission };
    }

    async removeRoleFromUser(userId: string): Promise<IGlobalRes<IUserRole>> {
        const user = await this.prisma.userRole.findFirst({
            where: { userId, status: true }
        });
        if (!user) {
            throw new NotFoundException("User role not found");
        }
        const data = await this.prisma.userRole.update({
            where: { userId_role: { userId, role: user.role } },
            data: { status: false }
        });
        return { success: true, message: "Role removed successfully", data };
    }
}