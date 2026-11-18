import { z } from 'zod';
import { LIMITS } from '../constants.js';
import { idSchema } from './common.js';

export const commentBodySchema = z
  .string('Komentář je povinný')
  .trim()
  .min(1, 'Komentář nesmí být prázdný')
  .max(LIMITS.commentMax, `Komentář může mít nejvýše ${LIMITS.commentMax} znaků`);

export const createCommentSchema = z.object({ body: commentBodySchema });
export type CreateCommentInput = z.infer<typeof createCommentSchema>;

export const updateCommentSchema = z.object({ body: commentBodySchema });
export type UpdateCommentInput = z.infer<typeof updateCommentSchema>;

export const commentParamsSchema = z.object({ commentId: idSchema });
