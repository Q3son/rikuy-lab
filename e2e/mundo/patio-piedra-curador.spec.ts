import { expect, test } from '../_arnes/avion.ts';

test('Patio: a challenge station in the museum opens the challenge and progress is per group', async ({ page }) => {
  await page.goto('./#/museo/patio');
  await page.getByRole('button', { name: 'Ir a Feria de Chivay' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/retos\/feria$/, { timeout: 15_000 });
  await page.getByLabel('Respuesta (soles)').fill('6');
  await page.keyboard.press('Enter');
  await expect(page.getByText('Paso 2 de 3')).toBeVisible();
  await expect(page.locator('body')).not.toContainText(/puntaje|ranking/i);
});

test('the curator opens the back gallery of the Física hall from the keyboard', async ({ page }) => {
  await page.goto('./#/museo/sala-fisica');
  await page.getByRole('button', { name: 'Ir a la curadora de la sala' }).focus();
  await page.keyboard.press('Enter');
  await expect(page.getByRole('heading', { name: 'La curadora de la sala pregunta' })).toBeVisible({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Lo largo del hilo' }).click();
  await expect(page.getByText(/La reja de la galería ya está abierta/)).toBeVisible();
});

test('the group names its stone and the name is kept', async ({ page }) => {
  await page.goto('./#/museo/piedra');
  await page.getByLabel('Nombre de la piedra').fill('Rumi');
  await page.getByRole('button', { name: 'Guardar nuestra piedra' }).click();
  await expect(page.getByRole('status')).toContainText('Rumi');
  await page.reload();
  await expect(page.getByLabel('Nombre de la piedra')).toHaveValue('Rumi');
});
