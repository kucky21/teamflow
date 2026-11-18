import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]): string {
  return twMerge(clsx(inputs));
}

export function initials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  const first = parts[0]?.[0] ?? '';
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? '') : '';
  return (first + last).toUpperCase() || '?';
}

/** Česká plurální forma: plural(3, ['úkol', 'úkoly', 'úkolů']) → „úkoly“. */
export function plural(count: number, forms: [string, string, string]): string {
  const abs = Math.abs(count);
  if (abs === 1) return forms[0];
  if (abs >= 2 && abs <= 4) return forms[1];
  return forms[2];
}
