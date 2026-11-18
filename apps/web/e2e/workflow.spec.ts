import { expect, test } from '@playwright/test';

import { dragTo, login, uniqueProjectKey } from './helpers';

test('vytvoření projektu, úkolu a přesun úkolu na Kanbanu', async ({ page }) => {
  const key = uniqueProjectKey();
  const projectName = `E2E projekt ${key}`;
  const taskTitle = `E2E úkol ${key}`;

  await login(page);

  // --- vytvoření projektu -------------------------------------------------
  await page.getByRole('link', { name: 'Projekty' }).first().click();
  await page.getByRole('main').getByRole('button', { name: 'Nový projekt', exact: true }).click();
  const projectDialog = page.getByRole('dialog');
  await projectDialog.getByLabel('Název').fill(projectName);
  await projectDialog.getByLabel('Klíč').fill(key);
  await projectDialog.getByRole('button', { name: 'Vytvořit projekt' }).click();

  await expect(page).toHaveURL(/\/projects\/[0-9a-f-]+\/board/);
  await expect(page.getByRole('heading', { level: 1, name: projectName })).toBeVisible();

  // --- vytvoření úkolu ----------------------------------------------------
  await page.getByRole('main').getByRole('button', { name: 'Nový úkol', exact: true }).click();
  const taskDialog = page.getByRole('dialog');
  await taskDialog.getByLabel('Název').fill(taskTitle);
  await taskDialog.getByLabel('Popis').fill('Vytvořeno automatickým E2E testem.');
  await taskDialog.getByRole('button', { name: 'Vytvořit úkol' }).click();
  await expect(taskDialog).toBeHidden();

  const todoColumn = page.getByTestId('column-TODO');
  const progressColumn = page.getByTestId('column-IN_PROGRESS');
  const card = page.getByTestId('task-card').filter({ hasText: taskTitle });
  await expect(todoColumn.getByTestId('task-card').filter({ hasText: taskTitle })).toBeVisible();
  await expect(card).toContainText(`${key}-1`);

  // --- drag & drop do sloupce „Probíhá“ ------------------------------------
  const saved = page.waitForResponse((r) => r.url().includes('/move') && r.request().method() === 'POST');
  await dragTo(page, card, progressColumn);
  await expect(progressColumn.getByTestId('task-card').filter({ hasText: taskTitle })).toBeVisible();
  await expect(todoColumn.getByTestId('task-card')).toHaveCount(0);

  // Počkáme na uložení na serveru a ověříme, že změna přežije obnovení stránky.
  expect((await saved).ok()).toBe(true);
  await page.reload();
  await expect(progressColumn.getByTestId('task-card').filter({ hasText: taskTitle })).toBeVisible();
  await expect(progressColumn.getByTestId('column-count')).toHaveText('1');

  // --- rychlý náhled a historie --------------------------------------------
  await progressColumn.getByTestId('task-card').filter({ hasText: taskTitle }).click();
  const sheet = page.getByRole('dialog');
  await expect(sheet.getByTestId('task-key')).toHaveText(`${key}-1`);
  await sheet.getByRole('tab', { name: 'Historie' }).click();
  await expect(sheet.getByText('přesun')).toBeVisible();
  await expect(sheet.getByText('Probíhá').first()).toBeVisible();
});
