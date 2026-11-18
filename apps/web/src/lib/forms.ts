import type { FieldValues, Path, UseFormSetError } from 'react-hook-form';
import { ApiError } from './api';

/**
 * Přenese validační chyby ze serveru (details[].path) k odpovídajícím polím
 * formuláře. Vrací true, pokud byla alespoň jedna chyba přiřazena k poli.
 */
export function applyServerErrors<T extends FieldValues>(
  error: unknown,
  setError: UseFormSetError<T>,
  fields: readonly string[],
): boolean {
  if (!(error instanceof ApiError) || error.details.length === 0) return false;
  let applied = false;
  for (const detail of error.details) {
    if (fields.includes(detail.path)) {
      setError(detail.path as Path<T>, { type: 'server', message: detail.message });
      applied = true;
    }
  }
  return applied;
}
