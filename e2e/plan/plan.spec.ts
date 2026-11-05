/**
 * e2e of "Mi plan" in mock mode: upload a PDF to a local gateway with no keys, review side by side,
 * reject an item, read the suggestions and approve. No external network.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import net from 'node:net';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { comoDocente, expect, test } from '../_arnes/avion.ts';

test.beforeEach(({ page }) => comoDocente(page));

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ORIGEN_APP = `https://localhost:${process.env.RIKUY_E2E_PORT ?? 4173}`;

async function puertoLibre(): Promise<number> {
  return new Promise((res) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => res(port));
    });
  });
}

let nube: { url: string; proceso: ChildProcess } | undefined;
test.describe.configure({ mode: 'serial' });
test.beforeAll(async () => {
  const puerto = await puertoLibre();
  const proceso = spawn(process.execPath, [join(raiz, 'node_modules/tsx/dist/cli.mjs'), 'src/main.ts'], {
    cwd: join(raiz, 'apps/cloud'),
    env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '', PORT: String(puerto), RIKUY_AI_MODE: 'mock', CORS_ORIGINS: ORIGEN_APP },
    stdio: ['ignore', 'pipe', 'pipe'],
  });
  await new Promise<void>((ok, fallo) => {
    const t = setTimeout(() => fallo(new Error('apps/cloud did not start')), 30_000);
    proceso.stdout?.on('data', (d: Buffer) => {
      if (d.toString().includes('listening')) {
        clearTimeout(t);
        ok();
      }
    });
    proceso.once('exit', (c) => fallo(new Error(`apps/cloud exited with ${c}`)));
  });
  nube = { url: `http://127.0.0.1:${puerto}`, proceso };
});
test.afterAll(() => nube?.proceso.kill());

test('a PDF plan is read, reviewed side by side and approved', async ({ page, peticionesExternas }) => {
  await page.addInitScript((u) => localStorage.setItem('rikuy.nube', u), nube!.url);
  await page.goto('./#/docente/clase/plan');
  await expect(page.getByRole('heading', { name: 'Mi plan' })).toBeVisible();

  await page.getByLabel('Subir PDF').setInputFiles({ name: 'plan.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.7\n%demo\n') });
  await expect(page.getByRole('heading', { name: 'Revisa lo que leímos' })).toBeVisible({ timeout: 15_000 });
  await expect(page.getByText('Datos simulados: plan de ejemplo, sin IA real')).toBeVisible();
  await expect(page.getByText(/Se quitaron \d+ nombres o datos personales/)).toBeVisible();

  const sin = page.getByRole('article', { name: 'Participa en la campaña de limpieza del río Chili con su familia.' });
  await expect(sin.getByText('Sin correspondencia CNEB')).toBeVisible();
  await sin.getByRole('button', { name: 'Rechazar' }).click();
  await expect(page.getByRole('link', { name: 'Ver en holograma: pendulo' }).first()).toBeVisible();

  await page.getByRole('button', { name: 'Mejorar la información' }).click();
  await expect(page.getByText('Son sugerencias: nada se agrega sin que lo elijas')).toBeVisible();
  await page.getByRole('checkbox').first().check();

  await page.getByRole('button', { name: 'Aprobar plan' }).click();
  await expect(page.getByRole('heading', { name: 'Plan de clase aprobado' })).toBeVisible();

  // Stored on the device: still there after a reload.
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Plan de clase aprobado' })).toBeVisible();
  expect(peticionesExternas.filter((u) => !u.startsWith(nube!.url))).toEqual([]);
});

test('without a gateway, the sample plan still works', async ({ page }) => {
  await page.goto('./#/docente/clase/plan');
  await page.getByRole('button', { name: 'Usar plan de ejemplo' }).click();
  await expect(page.getByRole('heading', { name: 'Revisa lo que leímos' })).toBeVisible();
});
