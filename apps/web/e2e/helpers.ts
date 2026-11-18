import { expect, type Locator, type Page } from '@playwright/test';

export const DEMO = { email: 'demo@teamflow.local', password: 'Demo1234!' };

export async function login(page: Page, email = DEMO.email, password = DEMO.password) {
  await page.goto('/login');
  await page.getByLabel('E-mail').fill(email);
  await page.getByLabel('Heslo').fill(password);
  await page.getByRole('button', { name: 'Přihlásit se' }).click();
  await expect(page.getByRole('heading', { level: 1 })).toContainText(/Dobr(é|ý)/);
}

/** Náhodný klíč projektu, aby testy šlo spouštět opakovaně nad stejnou databází. */
export function uniqueProjectKey(): string {
  const letters = 'ABCDEFGHJKLMNPQRSTUVWXYZ';
  let key = 'E';
  for (let i = 0; i < 4; i++) key += letters.charAt(Math.floor(Math.random() * letters.length));
  return key;
}

/**
 * Drag & drop myší v krocích – dnd-kit reaguje na pointer události
 * a aktivuje tažení až po posunu o několik pixelů.
 */
export async function dragTo(page: Page, source: Locator, target: Locator) {
  const from = await source.boundingBox();
  const to = await target.boundingBox();
  if (!from || !to) throw new Error('Prvek pro drag & drop není viditelný');
  const startX = from.x + from.width / 2;
  const startY = from.y + Math.min(20, from.height / 2);
  await page.mouse.move(startX, startY);
  await page.mouse.down();
  await page.mouse.move(startX + 10, startY + 10, { steps: 5 });
  await page.mouse.move(to.x + to.width / 2, to.y + 60, { steps: 20 });
  await page.mouse.move(to.x + to.width / 2, to.y + 70, { steps: 5 });
  await page.mouse.up();
}
