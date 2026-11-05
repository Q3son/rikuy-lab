import { alModoAvion, expect, test } from '../_arnes/avion.ts';

// Gate of F6 (5.4): after one online load, the panel and a #/p/… link open in airplane mode after a full reload.
// Pending until F1 ships the Workbox service worker (same reason as e2e/_arnes/shell.avion.spec.ts).
test.fixme('the teacher panel opens after a reload in airplane mode', async ({ page }) => {
  await alModoAvion(page, './#/docente');
  await expect(page.getByRole('heading', { name: 'Aún no tienes una clase hoy' })).toBeVisible({ timeout: 3_000 });
});
