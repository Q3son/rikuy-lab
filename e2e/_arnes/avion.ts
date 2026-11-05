/**
 * Shared e2e harness (sprint 0 + F1). Every front imports `test`/`expect` from here.
 *
 * - `alModoAvion(page)`: online load -> wait for the service worker to control the page ->
 *   `context.setOffline(true)` -> reload. Used by the `avion` project (5.6).
 * - `peticionesExternas`: every request that leaves the app origin during a test, for the
 *   "no leaks" gate (e2e/docente/privacidad.spec.ts, 4.6).
 */
import { test as base, expect, type Page } from '@playwright/test';

export async function alModoAvion(page: Page, ruta = './'): Promise<void> {
  await page.goto(ruta);
  await page.evaluate(async () => {
    const reg = await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise<void>((resolve) => navigator.serviceWorker.addEventListener('controllerchange', () => resolve(), { once: true }));
    }
    return reg.active?.state;
  });
  await page.context().setOffline(true);
  await page.reload();
}

export const test = base.extend<{ peticionesExternas: string[] }>({
  peticionesExternas: async ({ page, baseURL }, use) => {
    const origen = new URL(baseURL ?? 'https://localhost/').origin;
    const fuera: string[] = [];
    page.on('request', (r) => {
      const url = r.url();
      if (!url.startsWith(origen) && !url.startsWith('data:') && !url.startsWith('blob:')) fuera.push(url);
    });
    await use(fuera);
  },
});

export { expect };

type Sesion = { rol: 'docente' | 'grupo'; codigoClase?: string; apodo?: string };

/**
 * Starts the page with a role already chosen (the shell sends a device without a role to the entry).
 * Written before any app script runs, in the shape of the persisted F1 session (`rikuy.sesion`).
 */
export async function conSesion(page: Page, s: Sesion): Promise<void> {
  const estado = { rol: s.rol, codigoClase: s.codigoClase ?? null, apodo: s.apodo ?? null, nivel: 'normal' };
  await page.addInitScript((valor) => {
    if (!localStorage.getItem('rikuy.sesion')) localStorage.setItem('rikuy.sesion', valor);
  }, JSON.stringify({ state: estado, version: 0 }));
}

export const comoDocente = (page: Page) => conSesion(page, { rol: 'docente' });
export const comoGrupo = (page: Page, codigoClase = 'ABC123', apodo = 'Puma') => conSesion(page, { rol: 'grupo', codigoClase, apodo });
