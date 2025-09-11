import { SetMetadata } from '@nestjs/common';
import { Permissions } from 'generated/prisma';

export const PERMISSIONS_KEY = 'permissions';
export const PermissionsRequired = (...permissions: Permissions[]) =>
    SetMetadata(PERMISSIONS_KEY, permissions);
