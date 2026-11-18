import { z } from 'zod';
import { idSchema } from './common.js';

export const activityQuerySchema = z.object({
  /** Kurzorové stránkování: ID poslední načtené položky. */
  cursor: idSchema.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
});
export type ActivityQuery = z.infer<typeof activityQuerySchema>;

export const dashboardQuerySchema = z.object({
  /** IANA časové pásmo klienta pro správné seskupení po dnech. */
  tz: z
    .string()
    .max(64)
    .refine((tz) => {
      try {
        new Intl.DateTimeFormat('en-US', { timeZone: tz });
        return true;
      } catch {
        return false;
      }
    }, 'Neplatné časové pásmo')
    .default('UTC'),
});
export type DashboardQuery = z.infer<typeof dashboardQuerySchema>;
