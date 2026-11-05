import { comoDocente, expect, test } from '../_arnes/avion.ts';

// The shell sends a device without a role to the entry screen.
test.beforeEach(({ page }) => comoDocente(page));

// 5.6 "Sin fugas": during the class, with iaNube=false, nothing leaves the origin.
test('no request leaves the origin while running the teacher flow', async ({ page, peticionesExternas }) => {
  await page.goto('./#/docente');
  await page.getByRole('button', { name: 'Usar la clase de ejemplo' }).click();
  for (const ruta of ['evidencia', 'evidencia/evidencias', 'evidencia/resumen', 'reportes', 'reportes/envios', 'clase/llevar', 'clase/museo', 'clase/ayudas', 'ajustes']) {
    await page.goto(`./#/docente/${ruta}`);
    await page.waitForLoadState('networkidle');
  }
  expect(peticionesExternas).toEqual([]);
});
