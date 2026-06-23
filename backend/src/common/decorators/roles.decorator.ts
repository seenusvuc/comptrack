import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';
export type AppRole = 'employee' | 'manager' | 'hr_admin' | 'super_admin';

export const Roles = (...roles: AppRole[]) => SetMetadata(ROLES_KEY, roles);
