/**
 * Golden path of the pitch: a projector phone (pyramid) and a group control phone in the same room.
 * Two pages of one browser share the BroadcastChannel, as two tabs would; on two real phones the
 * same messages go through the classroom relay (/ws).
 */
import { expect, test } from '../_arnes/avion.ts';

test('the control phone drives the projector and both confirm each order', async ({ context, page, peticionesExternas }) => {
  await page.goto('./#/holo/proyector/k7m2');
  await expect(page.getByText('K7M2')).toBeVisible();
  await expect(page.getByRole('img', { name: /QR para unirse/ })).toBeVisible();

  const control = await context.newPage();
  await control.goto('./#/holo/control/k7m2');
  await expect(control.getByText(/Proyector conectado/)).toBeVisible();
  await expect(page.getByText('K7M2')).toBeHidden(); // the join card hides once the control is in

  await control.getByRole('button', { name: /Pausa/ }).click();
  await expect(page.getByText('Pausa', { exact: true })).toBeVisible();
  await expect(control.getByText(/El proyector hizo: Pausa · \d+ ms/)).toBeVisible();

  await control.getByRole('button', { name: /Soltar el péndulo/ }).click();
  await expect(control.getByText(/El proyector hizo: Soltar el péndulo/)).toBeVisible();

  // Touch fallback works without the camera.
  await expect(control.getByRole('button', { name: /Activar cámara de manos/ })).toBeVisible();
  expect(peticionesExternas).toEqual([]);
});

test('GATE: with gestures switched off by the teacher, getUserMedia is never called', async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem('rikuy.gestos.interruptor', '0');
    const calls = ((window as unknown as { __gum: number }).__gum = 0);
    void calls;
    navigator.mediaDevices.getUserMedia = async () => {
      (window as unknown as { __gum: number }).__gum++;
      throw new DOMException('blocked', 'NotAllowedError');
    };
  });
  await page.goto('./#/holo/control/k7m2');
  await expect(page.getByRole('button', { name: /Activar cámara de manos/ })).toHaveCount(0);
  await expect(page.getByText(/La profesora apagó los gestos/)).toBeVisible();
  expect(await page.evaluate(() => (window as unknown as { __gum: number }).__gum)).toBe(0);
});
