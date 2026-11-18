/** Převod mezi `Date` (sloupec typu DATE, UTC půlnoc) a řetězcem YYYY-MM-DD. */
export function toIsoDate(date: Date): string {
  return date.toISOString().slice(0, 10);
}

export function fromIsoDate(value: string): Date {
  return new Date(`${value}T00:00:00.000Z`);
}

/** Dnešní datum (UTC) jako půlnoc – pro porovnání se sloupcem DATE. */
export function todayUtc(now = new Date()): Date {
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
}

export function iso(date: Date): string;
export function iso(date: Date | null): string | null;
export function iso(date: Date | null): string | null {
  return date ? date.toISOString() : null;
}
