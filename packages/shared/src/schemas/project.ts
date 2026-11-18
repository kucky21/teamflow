import { z } from 'zod';
import { LIMITS, PROJECT_ICONS, PROJECT_ROLES, PROJECT_STATUSES } from '../constants.js';
import { PROJECT_KEY_PATTERN } from '../task-key.js';
import { booleanParam, colorSchema, idSchema } from './common.js';

export const projectRoleSchema = z.enum(PROJECT_ROLES, 'Neplatná role');
export const projectStatusSchema = z.enum(PROJECT_STATUSES, 'Neplatný stav projektu');
export const projectIconSchema = z.enum(PROJECT_ICONS, 'Neplatná ikona');

const projectName = z
  .string('Název je povinný')
  .trim()
  .min(2, 'Název musí mít alespoň 2 znaky')
  .max(LIMITS.projectNameMax, `Název může mít nejvýše ${LIMITS.projectNameMax} znaků`);

const projectDescription = z
  .string()
  .trim()
  .max(LIMITS.projectDescriptionMax, `Popis může mít nejvýše ${LIMITS.projectDescriptionMax} znaků`);

export const projectKeySchema = z
  .string('Klíč je povinný')
  .trim()
  .toUpperCase()
  .regex(PROJECT_KEY_PATTERN, 'Klíč musí mít 2–6 znaků (A–Z, 0–9) a začínat písmenem');

export const createProjectSchema = z.object({
  name: projectName,
  key: projectKeySchema,
  description: projectDescription.optional(),
  color: colorSchema,
  icon: projectIconSchema,
  status: projectStatusSchema.default('ACTIVE'),
});
export type CreateProjectInput = z.input<typeof createProjectSchema>;

export const updateProjectSchema = z
  .object({
    name: projectName,
    description: projectDescription.nullable(),
    color: colorSchema,
    icon: projectIconSchema,
    status: projectStatusSchema,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nebyla zadána žádná změna');
export type UpdateProjectInput = z.infer<typeof updateProjectSchema>;

export const projectListQuerySchema = z.object({
  archived: booleanParam,
});

export const addMemberSchema = z.object({
  userId: idSchema,
  role: projectRoleSchema.default('MEMBER'),
});
export type AddMemberInput = z.input<typeof addMemberSchema>;

export const updateMemberSchema = z.object({
  role: projectRoleSchema,
});
export type UpdateMemberInput = z.infer<typeof updateMemberSchema>;

export const projectParamsSchema = z.object({ projectId: idSchema });
export const memberParamsSchema = z.object({ projectId: idSchema, userId: idSchema });
