import { expect, test } from '../_arnes/avion.ts';

test('closing by QR: the group QR gives literal quotes and the Indaga report', async ({ page }) => {
  await page.goto('./#/docente');
  await page.getByRole('button', { name: 'Usar la clase de ejemplo' }).click();
  await page.goto('./#/docente/evidencia');
  await page.getByRole('button', { name: 'Simular QR de un grupo' }).click();
  await expect(page.getByText(/Recibido: \d+ eventos nuevos/)).toBeVisible({ timeout: 20_000 });

  await page.getByRole('link', { name: 'Evidencias' }).click();
  await expect(page.getByText('«si la cuerda es más larga tarda más en volver»')).toBeVisible();
  await expect(page.getByText('Sin evidencia aún').first()).toBeVisible();

  await page.getByRole('link', { name: 'Reportes' }).click();
  await expect(page.getByRole('heading', { name: /Indaga mediante métodos científicos/ })).toBeVisible();
});

test('the tutor kill switch survives a reload', async ({ page }) => {
  await page.goto('./#/docente');
  await page.getByRole('button', { name: 'Usar la clase de ejemplo' }).click();
  const sw = page.getByRole('switch', { name: 'Tutor Rikuy' });
  await expect(sw).toBeChecked();
  await sw.click();
  await page.reload();
  await expect(page.getByRole('switch', { name: 'Tutor Rikuy' })).not.toBeChecked();
});
