import { z } from 'zod';

import { AVATAR_COLORS } from '../constants.js';
import { emailSchema, passwordSchema, personNameSchema } from './common.js';

export const registerSchema = z.object({
  name: personNameSchema,
  email: emailSchema,
  password: passwordSchema,
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const loginSchema = z.object({
  email: emailSchema,
  // Při přihlášení nevynucujeme pravidla síly hesla – jen rozumné limity.
  password: z.string('Heslo je povinné').min(1, 'Zadejte heslo').max(128),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const updateProfileSchema = z.object({
  name: personNameSchema.optional(),
  avatarColor: z.enum(AVATAR_COLORS).optional(),
});
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Zadejte současné heslo').max(128),
    newPassword: passwordSchema,
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    path: ['newPassword'],
    error: 'Nové heslo se musí lišit od současného',
  });
export type ChangePasswordInput = z.infer<typeof changePasswordSchema>;

export const userSearchQuerySchema = z.object({
  q: z.string().trim().max(100).optional(),
  excludeProjectId: z.uuid().optional(),
});
export type UserSearchQuery = z.infer<typeof userSearchQuerySchema>;
