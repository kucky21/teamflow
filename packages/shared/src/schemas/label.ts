import { z } from 'zod';

import { colorSchema, idSchema } from './common.js';

const labelName = z
  .string('Název štítku je povinný')
  .trim()
  .min(1, 'Název štítku je povinný')
  .max(32, 'Název štítku může mít nejvýše 32 znaků');

export const createLabelSchema = z.object({
  name: labelName,
  color: colorSchema,
});
export type CreateLabelInput = z.infer<typeof createLabelSchema>;

export const updateLabelSchema = z
  .object({ name: labelName, color: colorSchema })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'Nebyla zadána žádná změna');
export type UpdateLabelInput = z.infer<typeof updateLabelSchema>;

export const labelParamsSchema = z.object({ projectId: idSchema, labelId: idSchema });
