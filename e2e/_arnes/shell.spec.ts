import { expect, test } from './avion.ts';

test('the app opens and the classic hologram stays reachable by URL as a backup', async ({ page, peticionesExternas }) => {
  await page.goto('./');
  await expect(page.getByRole('heading', { name: 'Rikuy' })).toBeVisible();
  await page.goto('./clasico.html');
  await expect(page).toHaveURL(/clasico\.html/);
  expect(peticionesExternas).toEqual([]);
});
