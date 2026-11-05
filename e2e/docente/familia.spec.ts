import type { Page } from '@playwright/test';
import { ejemplos } from '@rikuy/contracts/fixtures';
import { expect, test } from '../_arnes/avion.ts';

// The link is client-side only: build it the same way the app does and open it with the network cut.
async function enlace(page: Page): Promise<string> {
  return page.evaluate(async (paquete) => {
    const bytes = new TextEncoder().encode(JSON.stringify(paquete));
    const cs = new CompressionStream('deflate-raw');
    const w = cs.writable.getWriter();
    void w.write(bytes);
    void w.close();
    const out = new Uint8Array(await new Response(cs.readable).arrayBuffer());
    let c = 0xffffffff;
    for (const b of out) {
      c ^= b;
      for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    const crc = ((c ^ 0xffffffff) >>> 0).toString(36);
    let s = '';
    for (const b of out) s += String.fromCharCode(b);
    return `${btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')}.${crc}`;
  }, ejemplos.paquetePractica);
}

test('the #/p/… link opens with the network cut', async ({ page, context }) => {
  await page.goto('./');
  const carga = await enlace(page);
  await context.setOffline(true);
  await page.evaluate((c) => void (location.hash = `#/p/${c}`), carga);
  await expect(page.getByRole('heading', { level: 1, name: ejemplos.practica.titulo })).toBeVisible();
  await expect(page.getByRole('img', { name: 'Código para mostrar al volver al colegio' })).toBeVisible();
});
