import { Permissions, Roles } from "generated/prisma";
import { IGlobalRes } from "src/types";

export interface IUserRole {
    role: Roles;
    userId: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface IUserRoleService {
    assignRoleToUser(role: Roles, userId: string): Promise<IGlobalRes<IUserRole>>
    getUserRole(userId: string): Promise<IGlobalRes<IUserRole>>
    removeRoleFromUser(userId: string): Promise<IGlobalRes<IUserRole>>
    userHasPermission(userId: string, permission: Permissions): Promise<IGlobalRes<boolean>>
}