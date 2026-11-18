/**
 * Převede uživatelský dotaz na bezpečný PostgreSQL `tsquery` s prefixovým
 * vyhledáváním („logi“ najde „login“). Zachovává jen písmena a číslice,
 * takže výsledek nikdy neobsahuje operátory tsquery z uživatelského vstupu.
 * Diakritiku odstraňuje databázová funkce `teamflow_unaccent`.
 */
export function buildPrefixTsQuery(input: string, maxTerms = 8): string | null {
  const terms = input
    .normalize('NFC')
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length > 0)
    .slice(0, maxTerms);
  if (terms.length === 0) return null;
  return terms.map((t) => `${t}:*`).join(' & ');
}
