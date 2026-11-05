/**
 * F2 gate (5.4): two pages, two separate devices (browser contexts with their own IndexedDB).
 * The frames travel optically: a screenshot of the QR on one page is read on the other page through
 * the "read from photo" path (jsQR), out of order and with repeats. No network between them.
 */
import { devices, type Browser, type Page } from '@playwright/test';
import { expect, test } from '../_arnes/avion.ts';

async function device(browser: Browser, baseURL: string): Promise<Page> {
  const context = await browser.newContext({ ...devices['Pixel 5'], baseURL, ignoreHTTPSErrors: true });
  const page = await context.newPage();
  await page.goto('./#/relevo');
  await expect(page.getByRole('heading', { name: 'Relevo por QR' })).toBeVisible();
  return page;
}

/** Screenshots every frame of the QR carousel on `page` (paused, stepped by hand). */
async function captureFrames(page: Page): Promise<Buffer[]> {
  const qr = page.getByTestId('qr-cuadro');
  await expect(qr).toBeVisible();
  const caption = await page.getByText(/^Cuadro \d+ de \d+$/).textContent();
  const n = Number(/de (\d+)/.exec(caption ?? '')?.[1]);
  if (n > 1) await page.getByRole('button', { name: 'Pausar' }).click();
  const shots: Buffer[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < n; i++) {
    const frame = await qr.getAttribute('data-frame');
    if (!frame || seen.has(frame)) throw new Error('carousel did not advance');
    seen.add(frame);
    shots.push(await qr.screenshot());
    if (n > 1) {
      await page.getByRole('button', { name: 'Siguiente' }).click();
      await expect(qr).not.toHaveAttribute('data-frame', frame);
    }
  }
  return shots;
}

async function showPhotos(page: Page, inputLabel: string, shots: Buffer[]): Promise<void> {
  const input = page.getByLabel(inputLabel);
  for (const [i, buffer] of shots.entries()) {
    await input.setInputFiles({ name: `qr-${i}.png`, mimeType: 'image/png', buffer });
    await page.waitForTimeout(50);
  }
}

test('page A shows the QR frames, page B reads them and converges', async ({ browser, baseURL }) => {
  test.setTimeout(180_000);
  const teacher = await device(browser, baseURL!);
  const group = await device(browser, baseURL!);

  // Teacher creates the class and shows the signed join QR (J).
  await teacher.getByRole('button', { name: 'Crear clase' }).click();
  const codigo = (await teacher.getByTestId('codigo-clase').textContent())!;
  expect(codigo).toMatch(/^[A-Z0-9]{6}$/);
  const join = await captureFrames(teacher);

  // The group reads J and joins.
  await group.getByRole('tab', { name: 'Grupo' }).click();
  await showPhotos(group, 'Leer QR de unión: leer desde foto', [...join].reverse());
  await expect(group.getByRole('status')).toHaveText(`Unido a la clase ${codigo}`);

  // The group records 50 measurements and shows its events (E).
  await group.getByRole('button', { name: 'Registrar 50 mediciones de prueba' }).click();
  await expect(group.getByTestId('total-mediciones')).toHaveText('50');
  await group.getByRole('button', { name: 'Mostrar QR de eventos' }).click();
  const events = await captureFrames(group);
  expect(events.length).toBeGreaterThan(1);

  // The teacher reads them shuffled (reversed, interleaved halves) and with repeats.
  const half = Math.ceil(events.length / 2);
  const shuffled = [...events.slice(half).reverse(), events[0], ...events.slice(0, half), events[events.length - 1]];
  await showPhotos(teacher, 'Leer QR de un grupo: leer desde foto', shuffled);
  await expect(teacher.getByRole('status')).toHaveText(/^Eventos recibidos: 51 nuevos, 0 repetidos, 0 rechazados$/);
  await expect(teacher.getByTestId('total-mediciones')).toHaveText('50');
  await expect(teacher.getByTestId('total-grupos')).toHaveText('1');
  await expect(teacher.getByTestId('total-eventos')).toHaveText('52');

  // The teacher answers with its version vector (A); the group marks its events as delivered.
  const ack = await captureFrames(teacher);
  expect(ack).toHaveLength(1);
  await showPhotos(group, 'Leer QR de confirmación: leer desde foto', ack);
  await expect(group.getByRole('status')).toHaveText('La docente confirmó la entrega');
});
