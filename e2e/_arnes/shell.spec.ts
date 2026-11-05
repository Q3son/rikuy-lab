import { expect, test } from './avion.ts';

test('the app opens and keeps the classic hologram reachable', async ({ page, peticionesExternas }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Rikuy' })).toBeVisible();
  await page.getByRole('link', { name: /holográfico/ }).click();
  await expect(page).toHaveURL(/clasico\.html/);
  expect(peticionesExternas).toEqual([]);
});
