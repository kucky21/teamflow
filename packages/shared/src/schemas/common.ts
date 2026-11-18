import { z } from 'zod';
import { LIMITS, PALETTE_COLORS } from '../constants.js';

export const idSchema = z.uuid('Neplatný identifikátor');

export const colorSchema = z.enum(PALETTE_COLORS, 'Vyberte barvu z palety');

/** Datum ve formátu YYYY-MM-DD. */
export const isoDateSchema = z.iso.date('Neplatné datum');

export const emailSchema = z
  .string('E-mail je povinný')
  .trim()
  .toLowerCase()
  .pipe(z.email('Zadejte platnou e-mailovou adresu').max(254, 'E-mail je příliš dlouhý'));

export const passwordSchema = z
  .string('Heslo je povinné')
  .min(8, 'Heslo musí mít alespoň 8 znaků')
  .max(128, 'Heslo může mít nejvýše 128 znaků')
  .regex(/[A-Za-zÀ-ž]/, 'Heslo musí obsahovat alespoň jedno písmeno')
  .regex(/\d/, 'Heslo musí obsahovat alespoň jednu číslici');

export const personNameSchema = z
  .string('Jméno je povinné')
  .trim()
  .min(2, 'Jméno musí mít alespoň 2 znaky')
  .max(80, 'Jméno může mít nejvýše 80 znaků');

export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(LIMITS.pageSizeMax).default(LIMITS.pageSizeDefault),
});

/**
 * Parametr dotazu, který může přijít jako opakovaný klíč (`?a=1&a=2`)
 * nebo jako seznam oddělený čárkami (`?a=1,2`).
 */
export function listParam<T extends z.ZodType>(item: T) {
  return z.preprocess((value) => {
    if (value === undefined || value === null || value === '') return undefined;
    const raw = Array.isArray(value) ? value : [value];
    return raw
      .flatMap((v) => String(v).split(','))
      .map((v) => v.trim())
      .filter(Boolean);
  }, z.array(item).optional());
}

export const booleanParam = z
  .enum(['true', 'false', '1', '0'])
  .transform((v) => v === 'true' || v === '1')
  .optional();
