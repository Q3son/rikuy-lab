import { render, screen } from '@testing-library/react';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { describe, expect, it } from 'vitest';
import { rutas, rutasDeFeatures } from './rutas.tsx';

describe('app routes', () => {
  it('wires one route file per feature', () => {
    expect(Object.keys(rutasDeFeatures).sort()).toEqual(
      ['cerebro', 'creador', 'docente', 'familia', 'grupo', 'holo', 'lab', 'mundo', 'relevo', 'retos', 'tutor'],
    );
  });

  it('renders the home and keeps the classic hologram reachable', () => {
    render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: ['/'] })} />);
    expect(screen.getByRole('heading', { name: 'Rikuy' })).toBeTruthy();
    expect(screen.getByRole('link', { name: /holográfico/ }).getAttribute('href')).toBe('./clasico.html');
  });
});
