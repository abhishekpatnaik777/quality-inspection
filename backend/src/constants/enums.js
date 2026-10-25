import { z } from 'zod';

export const USER_STATUSES = ['active', 'inactive', 'invited'];
export const USER_ROLES = ['quality_engineer', 'supervisor'];
export const USER_ROLE_STATUSES = ['active', 'inactive'];
export const USER_SUPERVISOR_STATUSES = ['active', 'inactive'];

export const userStatusSchema = z.enum(USER_STATUSES);
export const roleSchema = z.enum(USER_ROLES);
export const userRoleStatusSchema = z.enum(USER_ROLE_STATUSES);
export const userSupervisorStatusSchema = z.enum(USER_SUPERVISOR_STATUSES);

export const DEFECT_TYPES = ['scratch', 'dent', 'paint_issue', 'missing_component', 'no_defect'];
export const PHYSICAL_DEFECT_TYPES = DEFECT_TYPES.filter((type) => type !== 'no_defect');
export const INSPECTION_STATUSES = ['pending', 'pass', 'fail'];
export const AI_INSPECTION_STATUSES = ['processing', 'awaiting_verification', 'completed', 'error'];
export const PREDICTION_STATUSES = ['pending', 'approved', 'overridden'];
export const SKU_CATEGORIES = ['electronics', 'mechanical', 'consumable', 'other'];
