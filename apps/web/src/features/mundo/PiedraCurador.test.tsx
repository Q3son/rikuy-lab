import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useEstadoGrupo } from './estadoGrupo.ts';
import { rutas } from './rutas.ts';

const abrir = (ruta: string) =>
  render(<RouterProvider router={createMemoryRouter([...rutas, { path: '*', element: <p>Otra ruta</p> }], { initialEntries: [ruta] })} />);

beforeEach(() => useEstadoGrupo.getState().reiniciar());
afterEach(cleanup);

describe('Nuestra piedra', () => {
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
