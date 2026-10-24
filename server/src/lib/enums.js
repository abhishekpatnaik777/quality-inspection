import { z } from 'zod';

export const USER_STATUSES = ['active', 'inactive', 'invited'];
export const USER_ROLES = ['quality_engineer', 'supervisor'];
export const USER_ROLE_STATUSES = ['active', 'inactive'];
export const USER_SUPERVISOR_STATUSES = ['active', 'inactive'];

export const userStatusSchema = z.enum(USER_STATUSES);
export const roleSchema = z.enum(USER_ROLES);
export const userRoleStatusSchema = z.enum(USER_ROLE_STATUSES);
export const userSupervisorStatusSchema = z.enum(USER_SUPERVISOR_STATUSES);
