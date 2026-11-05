import { expect, test } from '../_arnes/avion.ts';

/** Debug hook exposed by apps/web/src/features/mundo/VistaMundo.tsx. */
declare global {
  interface Window {
    __rikuyMundo?: { fps: () => number; avatares: () => number };
  }
}

/**
 * Gate 5.4 F5: >= 30 fps with CPU x4 and 40 simulated avatars. The loop is capped at 30 fps, so the
 * measured drawn-frame rate is compared with that cap (one frame of tolerance for vsync phase).
 */
test('the museum keeps the 30 fps cap with CPU x4 and 40 simulated groups', async ({ page, browserName }) => {
  test.skip(browserName !== 'chromium', 'CPU throttling needs the Chrome DevTools Protocol');
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: 4 });
  await page.goto('./#/museo?sim=40');
  await expect(page.getByRole('img', { name: /Mapa del vestíbulo/ })).toBeVisible();
  await page.waitForFunction(() => (window.__rikuyMundo?.avatares() ?? 0) >= 41, null, { timeout: 15_000 });
  // walk while measuring, so the camera and chunks move too
  await page.getByRole('button', { name: /Ir a la sala Auditorio$/ }).click();
  const muestras: number[] = [];
  for (let i = 0; i < 5; i++) {
    await page.waitForTimeout(1000);
    muestras.push(await page.evaluate(() => window.__rikuyMundo?.fps() ?? 0));
  }
  muestras.sort((a, b) => a - b);
  const mediana = muestras[2]!;
  test.info().annotations.push({ type: 'fps', description: `CPU x4, 41 avatares: ${muestras.join(', ')} (mediana ${mediana})` });
  console.log(`fps CPU x4 / 41 avatares: ${muestras.join(', ')}`);
  expect(mediana).toBeGreaterThanOrEqual(29);
});
