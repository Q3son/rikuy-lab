import { alModoAvion, expect, test } from './avion.ts';

// Gate of F1 (5.4): after one online load, the shell opens offline in < 3 s.
// Pending until F1 ships the Workbox service worker (vite-plugin-pwa, injectManifest).
test.fixme('the shell opens in airplane mode', async ({ page }) => {
  await alModoAvion(page);
  await expect(page.getByRole('heading', { name: 'Rikuy' })).toBeVisible({ timeout: 3_000 });
});
