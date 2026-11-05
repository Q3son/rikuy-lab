import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAyudante } from './ayudante/servicio.ts';
import { saldoQuipuAula, useEstadoGrupo } from './estadoGrupo.ts';
import { rutas } from './rutas.ts';

const abrir = (ruta: string) =>
  render(<RouterProvider router={createMemoryRouter([...rutas, { path: '*', element: <p>Otra ruta</p> }], { initialEntries: [ruta] })} />);

beforeEach(() => useEstadoGrupo.getState().reiniciar());
afterEach(cleanup);

/** Three help knots the teacher confirmed, between different groups and concepts. */
const NUDOS = Array.from({ length: 3 }, (_, i) => ({
  id: `nudo-${i}`,
  pedidoId: `pedido-${i}`,
  grupoAyudaId: `01JC0000000000000000000H0${i}`,
  grupoPideId: `01JC0000000000000000000P0${i}`,
  nodoId: `nodo-${i}`,
  estado: 'confirmado' as const,
  ts: 1_762_300_800_000 + i * 60_000,
}));

describe('class quipu (F10 ledger)', () => {
  it('counts the knots of confirmed help only', () => {
    expect(saldoQuipuAula([])).toBe(0);
    expect(saldoQuipuAula(NUDOS)).toBeGreaterThanOrEqual(5);
    expect(saldoQuipuAula(NUDOS)).toBeLessThan(10);
    expect(saldoQuipuAula(NUDOS.map((n) => ({ ...n, estado: 'por_confirmar' as const })))).toBe(0);
  });
});

describe('Nuestra piedra', () => {
  beforeEach(() => useAyudante.setState((s) => ({ estado: { ...s.estado, nudos: NUDOS } })));

  it('names the stone and picks an unlocked cord; locked options say how they open', async () => {
    abrir('/museo/piedra');
    const nombre = screen.getByLabelText('Nombre de la piedra');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, 'Rumi');
    await userEvent.click(screen.getByRole('button', { name: /Cordón grana/ }));
    expect(screen.getByRole('button', { name: /Cordón laguna \(se abre con 10 nudos del aula\)/ })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nuestra piedra' }));
    expect(useEstadoGrupo.getState().piedra).toEqual({ nombre: 'Rumi', cordon: 'grana', marco: 'tinta' });
    expect(screen.getByRole('status').textContent).toMatch(/Rumi/);
  });

  it('rejects names with numbers (no phone numbers)', async () => {
    abrir('/museo/piedra');
    const nombre = screen.getByLabelText('Nombre de la piedra');
    await userEvent.clear(nombre);
    await userEvent.type(nombre, '987654321');
    await userEvent.click(screen.getByRole('button', { name: 'Guardar nuestra piedra' }));
    expect(screen.getByRole('status').textContent).toMatch(/sin números/);
    expect(useEstadoGrupo.getState().piedra.nombre).toBe('Rikuy');
  });
});

describe('room curator', () => {
  it('asks the room question and opens the back gallery after an honest answer', async () => {
    abrir('/museo/sala-fisica');
    await userEvent.click(screen.getByRole('button', { name: 'Ir a la curadora de la sala' }));
    expect(screen.getByRole('heading', { name: 'La curadora de la sala pregunta' })).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'No sé todavía' }));
    expect(useEstadoGrupo.getState().rejas).toContain('sala-fisica');
    expect(screen.getByText(/La reja de la galería ya está abierta/)).toBeTruthy();
  });
});
