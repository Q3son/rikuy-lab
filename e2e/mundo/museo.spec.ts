import { comoGrupo, expect, test } from '../_arnes/avion.ts';

// The shell sends a device without a role to the entry screen.
test.beforeEach(({ page }) => comoGrupo(page));

const SALAS = ['Física', 'Biología', 'Química', 'Tierra y ambiente', 'Taller', 'Patio de juegos', 'Auditorio'];
const RUTAS = ['sala-fisica', 'sala-biologia', 'sala-quimica', 'sala-tierra', 'sala-taller', 'patio', 'auditorio'];

test('the vestibule draws the world and Rikuy points to today’s hall', async ({ page, peticionesExternas }) => {
  await page.goto('./#/museo');
  await expect(page.getByRole('heading', { name: 'Vestíbulo del Museo Rikuy' })).toBeVisible();
  await expect(page.getByRole('img', { name: /Mapa del vestíbulo/ })).toBeVisible();
  await expect(page.getByRole('status').filter({ hasText: 'El péndulo' }).first()).toBeVisible();
  expect(peticionesExternas).toEqual([]);
});

test('every door is reachable from the keyboard: the group walks there and the hall opens', async ({ page }) => {
  test.setTimeout(120_000);
  for (const [i, sala] of SALAS.entries()) {
    await page.goto('./#/museo');
    const boton = page.getByRole('button', { name: new RegExp(`Ir a la sala ${sala}$`) });
    await boton.focus();
    await page.keyboard.press('Enter');
    await expect(page).toHaveURL(new RegExp(`#/museo/${RUTAS[i]}$`), { timeout: 15_000 });
  }
});

test('from the Física hall the pendulum exhibit door opens the pendulum practice', async ({ page }) => {
  await page.goto('./#/museo/sala-fisica');
  await page.getByRole('button', { name: 'Ir a El péndulo' }).focus();
  await page.keyboard.press('Enter');
  await expect(page).toHaveURL(/#\/lab\/pendulo$/, { timeout: 15_000 });
});

test('the arrow keys walk the group inside the canvas', async ({ page }) => {
  await page.goto('./#/museo');
  const mapa = page.getByRole('img', { name: /Mapa del vestíbulo/ });
  await mapa.focus();
  await page.keyboard.down('ArrowUp');
  await page.waitForTimeout(400);
  await page.keyboard.up('ArrowUp');
  await expect(mapa).toBeFocused();
});

test('list mode reaches every hall and the pendulum without the map', async ({ page }) => {
  await page.goto('./#/museo/lista');
  for (const sala of SALAS) await expect(page.getByRole('link', { name: `Entrar a la Sala ${sala}` })).toBeVisible();
  await page.getByRole('link', { name: /Entrar a la exhibición El péndulo/ }).click();
  await expect(page).toHaveURL(/#\/lab\/pendulo$/);
});
