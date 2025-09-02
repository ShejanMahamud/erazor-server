import { Permissions, Roles } from "generated/prisma";

export const ROLE_PERMISSIONS: Record<Roles, Permissions[]> = {
    [Roles.ADMIN]: [
        Permissions.MANAGE_USERS,
        Permissions.VIEW_ANALYTICS,
        Permissions.MANAGE_SUBSCRIPTIONS,
        Permissions.MANAGE_ROLES,
        Permissions.DELETE_IMAGES,
        Permissions.SYSTEM_SETTINGS,
        Permissions.REVIEW_IMAGES,
        Permissions.BLOCK_USER,
        Permissions.REMOVE_CONTENT,
    ],
    [Roles.MODERATOR]: [
        Permissions.REVIEW_IMAGES,
        Permissions.BLOCK_USER,
        Permissions.REMOVE_CONTENT,
        Permissions.VIEW_USER_ACTIVITY,
    ],
    [Roles.USER]: [
        Permissions.PROCESS_IMAGES,
        Permissions.VIEW_OWN_HISTORY,
    ],
};