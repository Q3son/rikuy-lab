import { alModoAvion, comoDocente, expect, test } from '../_arnes/avion.ts';

test.beforeEach(({ page }) => comoDocente(page));

// Gate of F6 (5.4): after one online load, the panel and a #/p/… link open in airplane mode after a full reload.
test('the teacher panel opens after a reload in airplane mode', async ({ page }) => {
  await alModoAvion(page, './#/docente');
  await expect(page.getByRole('heading', { name: 'Aún no tienes una clase hoy' })).toBeVisible({ timeout: 3_000 });
});
