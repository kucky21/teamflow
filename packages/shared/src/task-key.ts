/** Identifikátor úkolu ve tvaru `KLÍČ-ČÍSLO`, např. `TF-104`. */
export const TASK_KEY_PATTERN = /^([A-Z][A-Z0-9]{1,5})-(\d{1,9})$/;

/** Klíč projektu: 2–6 znaků, velká písmena a číslice, začíná písmenem. */
export const PROJECT_KEY_PATTERN = /^[A-Z][A-Z0-9]{1,5}$/;

export function formatTaskKey(projectKey: string, number: number): string {
  return `${projectKey}-${number}`;
}

export function parseTaskKey(value: string): { projectKey: string; number: number } | null {
  const match = TASK_KEY_PATTERN.exec(value.trim().toUpperCase());
  if (!match) return null;
  const [, projectKey, num] = match;
  const number = Number(num);
  if (!projectKey || !Number.isSafeInteger(number) || number < 1) return null;
  return { projectKey, number };
}

/** Navrhne klíč projektu z jeho názvu (např. „Mobilní aplikace“ → „MA“). */
export function suggestProjectKey(name: string): string {
  const normalized = name
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toUpperCase()
    .replace(/[^A-Z0-9 ]/g, ' ')
    .trim();
  const words = normalized.split(/\s+/).filter(Boolean);
  let key = '';
  if (words.length >= 2) {
    key = words
      .slice(0, 4)
      .map((w) => w[0])
      .join('');
  } else if (words[0]) {
    key = words[0].slice(0, 3);
  }
  key = key.replace(/^[0-9]+/, '');
  if (key.length < 2) key = `${key}PRJ`.slice(0, 3);
  return key.slice(0, 6);
}
