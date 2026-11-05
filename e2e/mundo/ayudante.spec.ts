import { comoDocente, expect, test } from '../_arnes/avion.ts';

// The teacher runs the whole demo on one phone: the board in the panel, then the museum (demo group).
test.beforeEach(({ page }) => comoDocente(page));

test('Ayudante del museo: teacher switch, request with chips, simulated helper, restated phrase, knot confirmed', async ({ page, peticionesExternas }) => {
  await page.goto('./#/docente/clase/ayudas');
  await page.getByRole('checkbox', { name: /Ayudante del museo apagado/ }).check();
  await page.goto('./#/museo');
  await expect(page.getByText(/Ayudante del museo está encendido/)).toBeVisible();

  await page.getByRole('button', { name: 'Ir a la sala Física' }).click();
  await expect(page).toHaveURL(/#\/museo\/sala-fisica$/, { timeout: 15_000 });
  await page.getByRole('button', { name: 'Pedir ayuda a otro grupo' }).click();
  await page.getByRole('button', { name: 'Saltar la pista' }).click();
  await page.getByRole('button', { name: 'Longitud y periodo' }).click();
  await page.getByRole('button', { name: 'Que me muestren cómo lo midieron' }).click();
  await page.getByRole('button', { name: 'Enviar pedido' }).click();

  await expect(page.getByText(/viene a tu mesa/)).toBeVisible({ timeout: 10_000 });
  await page.getByLabel('¿Lo puedes decir con tus palabras?').fill('Si la cuerda es más larga el péndulo tarda más en volver');
  await page.getByRole('button', { name: 'Nos ayudó' }).click();

  await page.goto('./#/docente/clase/ayudas');
  await page.getByRole('button', { name: 'Confirmar nudo' }).click();
  await expect(page.getByText('Confirmado', { exact: true })).toBeVisible();
  expect(peticionesExternas).toEqual([]);
});
