/**
 * Řazení úkolů v Kanbanu pomocí frakčního indexování.
 *
 * Každý úkol má číselnou pozici. Při přesunu se nová pozice spočítá jako
 * střed mezi sousedy, takže se mění jediný řádek. Pokud mezera mezi sousedy
 * klesne pod hranici přesnosti, sloupec se přečísluje (rebalance).
 */

export const POSITION_STEP = 1024;
/** Minimální rozestup, pod kterým už střed nespočítáme spolehlivě. */
export const MIN_POSITION_GAP = 1e-6;

/**
 * Vrátí pozici mezi `prev` a `next` (null = okraj sloupce),
 * nebo `null`, pokud je mezi nimi příliš malá mezera a je nutné přečíslování.
 */
export function positionBetween(prev: number | null, next: number | null): number | null {
  if (prev === null) return next === null ? POSITION_STEP : next - POSITION_STEP;
  if (next === null) return prev + POSITION_STEP;
  if (next <= prev) return null;
  if (next - prev < MIN_POSITION_GAP * 2) return null;
  return prev + (next - prev) / 2;
}

/** Rovnoměrně rozložené pozice pro `count` položek (1024, 2048, …). */
export function evenPositions(count: number): number[] {
  return Array.from({ length: count }, (_, i) => (i + 1) * POSITION_STEP);
}

export interface Positioned {
  id: string;
  position: number;
}

/**
 * Najde sousedy pro vložení do seřazeného sloupce.
 * - `prevId` má přednost: úkol se vloží hned za něj.
 * - jinak `nextId`: úkol se vloží hned před něj.
 * - bez sousedů (nebo když neexistují) se úkol vloží na konec sloupce.
 * `column` nesmí obsahovat přesouvaný úkol a musí být seřazený vzestupně.
 */
export function resolveNeighbours(
  column: readonly Positioned[],
  prevId: string | null | undefined,
  nextId: string | null | undefined,
): { prev: Positioned | null; next: Positioned | null } {
  if (prevId) {
    const index = column.findIndex((t) => t.id === prevId);
    if (index !== -1) return { prev: column[index] ?? null, next: column[index + 1] ?? null };
  }
  if (nextId) {
    const index = column.findIndex((t) => t.id === nextId);
    if (index !== -1) return { prev: column[index - 1] ?? null, next: column[index] ?? null };
  }
  return { prev: column[column.length - 1] ?? null, next: null };
}
