/**
 * F3 gates (5.4): the full pendulum practice in airplane mode, with its events persisted.
 * The page is loaded online once; then the network is cut and the whole practice runs offline.
 * The reload-offline variant waits for F1's service worker (see the fixme below).
 */
import type { Page } from '@playwright/test';
import { alModoAvion, expect, test } from '../_arnes/avion.ts';

const HOLO_CHUNK = /VisorExhibicion3D|ViewController/;

async function eventosGuardados(page: Page): Promise<Array<{ tipo: string; seq: number }>> {
  return page.evaluate(
    () =>
      new Promise((resolve, reject) => {
        const req = indexedDB.open('rikuy-lab');
        req.onerror = () => reject(req.error);
        req.onsuccess = () => {
          const tx = req.result.transaction('eventos', 'readonly');
          const all = tx.objectStore('eventos').getAll();
          all.onsuccess = () => resolve(all.result.map((e: { tipo: string; seq: number }) => ({ tipo: e.tipo, seq: e.seq })));
        };
      }),
  );
}

async function medir(page: Page, largo: string, segundos: string) {
  await page.getByRole('radio', { name: largo, exact: true }).click();
  await page.getByLabel(/Tiempo de 10 oscilaciones/).fill(segundos);
  await page.getByRole('button', { name: /Guardar esta medida/ }).click();
}

test('the whole pendulum practice works offline and its events stay on the device', async ({ page, context, peticionesExternas }) => {
  const holo: string[] = [];
  page.on('request', (r) => HOLO_CHUNK.test(r.url()) && holo.push(r.url()));

  await page.goto('./#/lab/pendulo');
  await expect(page.getByRole('heading', { level: 1, name: /péndulo/i })).toBeVisible();

  // GATE: no measuring before predicting.
  await expect(page.getByRole('timer')).toHaveCount(0);
  await expect(page.getByRole('button', { name: /Guardar predicción/ })).toBeDisabled();

  await page.getByRole('radio', { name: 'Largo de la cuerda' }).click();
  await page.getByLabel(/¿Qué pasará\?/).fill('Si alargo la cuerda, tarda más');
  await page.getByLabel(/¿Por qué lo crees\?/).fill('recorre más camino');
  await page.getByRole('button', { name: /Guardar predicción/ }).click();
  await expect(page.getByRole('timer')).toBeVisible();

  // GATE: the hologram (Three.js) loads only when opened.
  expect(holo).toEqual([]);
  await page.getByRole('button', { name: /Ver el holograma/ }).click();
  await expect.poll(() => holo.length).toBeGreaterThan(0);
  await expect(page.getByRole('figure').or(page.getByRole('alert'))).toBeVisible();

  await context.setOffline(true);

  // One length with the real stopwatch (10 taps), two by typing the time.
  await page.getByRole('radio', { name: '25 cm', exact: true }).click();
  await page.getByRole('button', { name: /Iniciar al soltar/ }).click();
  for (let i = 0; i < 10; i++) {
    await page.waitForTimeout(100);
    await page.getByRole('button', { name: /Va y vuelve/ }).click();
  }
  await expect(page.getByRole('table', { name: /Tus mediciones/ }).getByRole('row')).toHaveCount(2);
  await medir(page, '50 cm', '14.2');
  await medir(page, '100 cm', '20.9');

  await page.getByRole('button', { name: /Comparar con el modelo/ }).click();
  const comparacion = page.getByRole('table', { name: /Comparación con el modelo/ });
  await expect(comparacion.getByRole('cell', { name: '2,01' })).toBeVisible(); // 2π√(1/9.80665)
  await expect(comparacion.getByRole('cell', { name: '2,09' })).toBeVisible();

  await page.getByRole('radio', { name: /100 cm: 2,09 s/ }).click();
  await page.getByLabel(/Mi conclusión/).fill('Con 100 cm tardó 2,09 s: con la cuerda más larga tarda más.');
  await page.getByRole('button', { name: /Guardar conclusión/ }).click();
  await expect(page.getByText(/Práctica terminada/)).toBeVisible();

  const eventos = await eventosGuardados(page);
  expect(eventos.map((e) => e.tipo)).toEqual([
    'respuesta.registrada', 'medicion.registrada', 'medicion.registrada', 'medicion.registrada', 'respuesta.registrada',
  ]);
  expect(eventos.map((e) => e.seq)).toEqual([1, 2, 3, 4, 5]);
  expect(peticionesExternas).toEqual([]);

  // Back online, a reload resumes the finished practice from the event log.
  await context.setOffline(false);
  await page.reload();
  await expect(page.getByText(/Práctica terminada/)).toBeVisible();
});

// Pending F1's Workbox service worker (same reason as e2e/_arnes/shell.avion.spec.ts).
test.fixme('the practice reopens after an offline reload', async ({ page }) => {
  await alModoAvion(page, './#/lab/pendulo');
  await expect(page.getByRole('heading', { level: 1, name: /péndulo/i })).toBeVisible();
});
