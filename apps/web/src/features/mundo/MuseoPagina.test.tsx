import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { registroMuseo } from './eventos.ts';
import { rutas } from './rutas.ts';

afterEach(cleanup);

const abrir = (ruta: string) => {
  const router = createMemoryRouter([...rutas, { path: '*', element: <p>Otra ruta</p> }], { initialEntries: [ruta] });
  render(<RouterProvider router={router} />);
  return router;
};

describe('Museo Rikuy (vestibule and halls)', () => {
  it('shows the vestibule with one door button per hall and Rikuy pointing to today’s hall', () => {
    abrir('/museo');
    expect(screen.getByRole('heading', { name: 'Vestíbulo del Museo Rikuy' })).toBeTruthy();
    const nav = screen.getByRole('navigation', { name: 'Destinos' });
    for (const sala of ['Física', 'Biología', 'Química', 'Tierra y ambiente', 'Taller', 'Patio de juegos', 'Auditorio']) {
      expect(within(nav).getByRole('button', { name: new RegExp(`Ir a la sala ${sala}$`) })).toBeTruthy();
    }
    expect(screen.getAllByRole('status')[0]!.textContent).toMatch(/El péndulo/);
  });

  it('opens a door from the keyboard (directly when the canvas is unavailable)', async () => {
    const router = abrir('/museo');
    const boton = screen.getByRole('button', { name: /Ir a la sala Física/ });
    boton.focus();
    await userEvent.keyboard('{Enter}');
    expect(router.state.location.pathname).toBe('/museo/sala-fisica');
  });

  it('records a museo.visita event without positions when an exhibit opens', async () => {
    const antes = registroMuseo.eventos.length;
    abrir('/museo/sala-fisica');
    await userEvent.click(screen.getByRole('button', { name: 'Ir a El péndulo' }));
    const nuevos = registroMuseo.eventos.slice(antes);
    expect(nuevos).toContainEqual({ tipo: 'museo.visita', datos: { salaId: 'sala-fisica', exhibicionId: 'exh-pendulo', grupoId: '01JC0000000000000000000G01' } });
    for (const e of nuevos) expect(JSON.stringify(e.datos)).not.toMatch(/"x"|"p"/);
  });

  it('shows the Física hall with the pendulum exhibit and the way back', () => {
    abrir('/museo/sala-fisica');
    expect(screen.getByRole('heading', { name: 'Sala Física' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Ir a El péndulo' })).toBeTruthy();
    expect(screen.getByRole('button', { name: 'Volver al vestíbulo' })).toBeTruthy();
  });

  it('handles an unknown hall gently', () => {
    abrir('/museo/no-existe');
    expect(screen.getByRole('link', { name: 'Volver al vestíbulo' })).toBeTruthy();
  });
});

describe('list mode', () => {
  it('reaches every hall and exhibit with plain links', () => {
    abrir('/museo/lista');
    // the list's own title plus one heading per hall; the shell's top bar owns the h1
    expect(screen.queryAllByRole('heading', { level: 1 })).toHaveLength(0);
    expect(screen.getAllByRole('heading', { level: 2 })).toHaveLength(8);
    expect(screen.getByRole('link', { name: 'Entrar a la Sala Física' }).getAttribute('href')).toBe('/museo/sala-fisica');
    expect(screen.getByRole('link', { name: /Entrar a la exhibición El péndulo/ }).getAttribute('href')).toBe('/exhibicion/exh-pendulo');
  });
});
