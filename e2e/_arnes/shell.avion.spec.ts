import { alModoAvion, expect, test } from './avion.ts';

// Gate of F1 (5.4): after one online load, the shell opens offline in < 3 s.
test('the shell opens in airplane mode', async ({ page }) => {
  await alModoAvion(page);
  const abierto = Date.now();
  await expect(page.getByRole('heading', { name: 'Rikuy' })).toBeVisible({ timeout: 3_000 });
  expect(Date.now() - abierto).toBeLessThan(3_000);
  await expect(page.getByRole('button', { name: /Soy docente/ })).toBeVisible();
});

// The role picker, the teacher home and the tabs also work with no network at all.
test('a teacher reaches "Mi clase de hoy" and every tab with no network', async ({ page }) => {
  await alModoAvion(page);
  await page.getByRole('button', { name: /Soy docente/ }).click();
  await expect(page.getByRole('heading', { name: 'Mi clase de hoy' })).toBeVisible();
  for (const [tab, titulo] of [['Clase', 'Clase'], ['Evidencia', 'Evidencia'], ['Reportes', 'Reportes'], ['Ajustes', 'Ajustes'], ['Hoy', 'Mi clase de hoy']] as const) {
    await page.getByRole('tab', { name: tab }).click();
    await expect(page.getByRole('heading', { level: 1, name: titulo, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Sin red, todo guardado').first()).toBeVisible();
});

// A group joins by class code and nickname, and the museum tabs work offline.
test('a group joins with a code and a nickname with no network', async ({ page }) => {
  await alModoAvion(page);
  await page.getByRole('button', { name: /Somos un grupo/ }).click();
  await page.getByLabel('Código de la clase').fill('CYT2B4');
  await page.getByLabel('Apodo del grupo').selectOption('Puma');
  await page.getByRole('button', { name: 'Entrar al museo' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Museo Rikuy', exact: true })).toBeVisible();
  await page.getByRole('tab', { name: 'Quipu' }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Quipu de logros' })).toBeVisible();
});

// The legacy hologram pages are precached too.
test('the classic hologram page opens offline', async ({ page }) => {
  await alModoAvion(page);
  await page.goto('./clasico.html');
  await expect(page).toHaveURL(/clasico\.html/);
});
