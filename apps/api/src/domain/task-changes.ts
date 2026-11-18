import type { ActivityChange } from '@teamflow/shared';

/**
 * Vypočítá seznam změn pro auditní log. Hodnoty jsou uloženy jako řetězce,
 * aby historie zůstala čitelná i po smazání navázaných záznamů
 * (např. jméno řešitele nebo názvy štítků).
 */
export function diffField(field: string, before: string | null, after: string | null): ActivityChange | null {
  if (before === after) return null;
  return { field, from: before, to: after };
}

export function diffList(field: string, before: readonly string[], after: readonly string[]): ActivityChange | null {
  const a = [...before].sort();
  const b = [...after].sort();
  if (a.length === b.length && a.every((v, i) => v === b[i])) return null;
  return { field, from: a.length ? a.join(', ') : null, to: b.length ? b.join(', ') : null };
}

/** U dlouhých textů (popis) neukládáme obsah, jen informaci o změně. */
export function diffText(field: string, before: string | null, after: string | null): ActivityChange | null {
  if ((before ?? '') === (after ?? '')) return null;
  return { field, from: null, to: null };
}

export function compactChanges(changes: (ActivityChange | null)[]): ActivityChange[] {
  return changes.filter((c): c is ActivityChange => c !== null);
}
