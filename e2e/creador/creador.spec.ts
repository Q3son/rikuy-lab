/**
 * e2e of the Creador in mock mode (5.4 F7): the whole chain passes with no external network and no keys.
 * The cloud gateway runs as a local process in simulated mode; the page reaches it on loopback only.
 */
import { spawn, type ChildProcess } from 'node:child_process';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import net from 'node:net';
import { expect, test } from '../_arnes/avion.ts';

const raiz = resolve(dirname(fileURLToPath(import.meta.url)), '../..');
const ORIGEN_APP = 'https://localhost:4173';

async function puertoLibre(): Promise<number> {
  return new Promise((res) => {
    const s = net.createServer().listen(0, '127.0.0.1', () => {
      const { port } = s.address() as net.AddressInfo;
      s.close(() => res(port));
    });
  });
}

interface NubeLocal {
  url: string;
  parar(): void;
}

/** Starts apps/cloud with NO keys (forced mock mode) and waits until it listens. */
async function arrancarNube(extra: Record<string, string> = {}): Promise<NubeLocal> {
  const puerto = await puertoLibre();
  const proceso: ChildProcess = spawn(process.execPath, [join(raiz, 'node_modules/tsx/dist/cli.mjs'), 'src/main.ts'], {
    cwd: join(raiz, 'apps/cloud'),
    env: { PATH: process.env.PATH ?? '', SystemRoot: process.env.SystemRoot ?? '', PORT: String(puerto), RIKUY_AI_MODE: 'mock', CORS_ORIGINS: ORIGEN_APP, ...extra },
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
  return { url: `http://127.0.0.1:${puerto}`, parar: () => proceso.kill() };
}

test.describe.configure({ mode: 'serial' }); // one pair of local gateways for the whole file

let nube: NubeLocal;
let nubeSinCupo: NubeLocal;
test.beforeAll(async () => {
  [nube, nubeSinCupo] = await Promise.all([arrancarNube(), arrancarNube({ TOPE_MENSUAL_USD: '0' })]);
});
test.afterAll(() => {
  nube?.parar();
  nubeSinCupo?.parar();
});

const apuntarA = (url: string) => async ({ page }: { page: import('@playwright/test').Page }) => {
  await page.addInitScript((u) => localStorage.setItem('rikuy.nube', u), url);
};

test('the complete Creador chain passes with no external network', async ({ page, peticionesExternas }) => {
  await apuntarA(nube.url)({ page });
  await page.goto('./#/creador');
  await expect(page.getByText('Datos simulados')).toBeVisible();

  await expect(page.getByRole('button', { name: 'Generar borrador' })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Generar borrador' }).click();

  await expect(page.getByRole('heading', { name: /Borrador de la práctica/ })).toBeVisible();
  await expect(page.getByText('Verificador: aprobado')).toBeVisible();
  await expect(page.getByText(/Revisión de Muse: ok/)).toBeVisible();

  await page.getByLabel('Pista 2').fill('Prueba con tres cuerdas de distinto largo y la misma tuerca.');
  await page.getByRole('button', { name: 'Aprobar y firmar' }).click();
  await expect(page.getByRole('heading', { name: /Práctica aprobada y firmada/ })).toBeVisible();

  await page.getByRole('button', { name: 'Publicar en la nube' }).click();
  await expect(page.getByText(/Publicada en la nube/)).toBeVisible();

  // The gateway registered the signed package.
  const lista = (await (await fetch(`${nube.url}/paquetes`)).json()) as { paquetes: Array<{ titulo: string }> };
  expect(lista.paquetes).toHaveLength(1);
  expect(lista.paquetes[0].titulo).toMatch(/péndulo/i);

  // Nothing left the machine: only loopback requests to the local gateway.
  expect(peticionesExternas.filter((u) => !u.startsWith(nube.url))).toEqual([]);
});

test('approval is blocked when an edited hint reveals the numeric result', async ({ page }) => {
  await apuntarA(nube.url)({ page });
  await page.goto('./#/creador');
  await expect(page.getByRole('button', { name: 'Generar borrador' })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Generar borrador' }).click();
  await expect(page.getByLabel('Pista 3')).toBeVisible();
  await page.getByLabel('Pista 3').fill('Debe salir 1,9 s con la cuerda de 0,9 m.');
  await page.getByRole('button', { name: 'Aprobar y firmar' }).click();
  await expect(page.getByRole('alert')).toContainText('pista 3');
  await expect(page.getByRole('heading', { name: /Práctica aprobada y firmada/ })).toHaveCount(0);
});

test('with the quota exhausted the Creador returns cuota and offers the catalog', async ({ page }) => {
  await apuntarA(nubeSinCupo.url)({ page });
  await page.goto('./#/creador');
  await expect(page.getByRole('button', { name: 'Generar borrador' })).toBeEnabled({ timeout: 15_000 });
  await page.getByRole('button', { name: 'Generar borrador' }).click();
  await expect(page.getByText(/cupo de IA/)).toBeVisible();
  await expect(page.getByRole('list', { name: /Catálogo/ }).getByRole('listitem').first()).toBeVisible();
});
