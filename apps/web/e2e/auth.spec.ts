import { expect, test } from '@playwright/test';

import { DEMO, login } from './helpers';

test.describe('autentizace', () => {
  test('nepřihlášený uživatel je přesměrován na přihlášení', async ({ page }) => {
    await page.goto('/projects');
    await expect(page).toHaveURL(/\/login\?next=%2Fprojects/);
    await expect(page.getByRole('heading', { name: 'Vítejte zpět' })).toBeVisible();
  });

  test('špatné heslo zobrazí chybu', async ({ page }) => {
    await page.goto('/login');
    await page.getByLabel('E-mail').fill(DEMO.email);
    await page.getByLabel('Heslo').fill('SpatneHeslo1');
    await page.getByRole('button', { name: 'Přihlásit se' }).click();
    await expect(page.getByRole('alert')).toContainText('Nesprávný e-mail nebo heslo');
  });

  test('přihlášení demo účtem, dashboard s daty a odhlášení', async ({ page }) => {
    await login(page);
    await expect(page.getByText('Aktivní projekty')).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Dokončené úkoly' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Moje přiřazené úkoly' })).toBeVisible();

    // Session je v HttpOnly cookie – po obnovení stránky zůstává uživatel přihlášen.
    await page.reload();
    await expect(page.getByTestId('user-menu')).toContainText('Tereza Dvořáková');

    await page.getByTestId('user-menu').click();
    await page.getByRole('menuitem', { name: 'Odhlásit se' }).click();
    await expect(page).toHaveURL(/\/login/);
    await page.goto('/');
    await expect(page).toHaveURL(/\/login/);
  });
});
