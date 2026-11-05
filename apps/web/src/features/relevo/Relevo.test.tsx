import 'fake-indexeddb/auto';
import { createDexieStore, createRikuyDb } from '@rikuy/store-dexie';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it } from 'vitest';
import { Relevo } from './Relevo.tsx';
import { createRelevo } from './relevo.ts';
import { rutas } from './rutas.ts';

const servicio = () => createRelevo(createDexieStore(createRikuyDb(`relevo-ui-${Math.random()}`)));

describe('Relevo page', () => {
  afterEach(cleanup);

  it('is reachable at #/relevo', () => {
    expect(rutas.map((r) => r.path)).toEqual(['relevo']);
  });

  it('the teacher creates a class and the join QR appears with the class code', async () => {
    render(<Relevo servicio={servicio()} />);
    await userEvent.click(screen.getByRole('button', { name: 'Crear clase' }));
    await waitFor(() => expect(screen.getByTestId('codigo-clase').textContent).toMatch(/^[A-Z0-9]{6}$/));
    const qr = await screen.findByTestId('qr-cuadro');
    expect(qr.getAttribute('data-frame')).toMatch(/^RK1:J:/);
    expect(await screen.findByText(/^Cuadro 1 de \d+$/)).toBeDefined();
    await waitFor(() => expect(screen.getByTestId('total-eventos').textContent).toBe('1'));
  });

  it('the group tab offers to read the join QR from a photo', async () => {
    render(<Relevo servicio={servicio()} />);
    await userEvent.click(screen.getByRole('tab', { name: 'Grupo' }));
    expect(screen.getByLabelText('Leer QR de unión: leer desde foto')).toBeDefined();
  });
});
