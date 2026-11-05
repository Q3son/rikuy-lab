import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { rutaAPantallaCompleta } from '../../shell/navegacion.ts';
import { construirMuseo } from '../mundo/catalogo.ts';
import { rutas } from '../mundo/rutas.ts';
import { destinoDeTema, temasDeEscena } from './guia.ts';

const HOY = { exhibicionId: 'exh-pendulo', salaId: 'sala-fisica' };

describe('Rikuy guide ("llévame", ported from AulaQuipu guides)', () => {
  const museo = construirMuseo();

  it('walks to the hall door of today’s exhibit from the vestibule, and to the exhibit inside the hall', () => {
    expect(destinoDeTema('exhibicion', museo.vestibulo, HOY)).toBe('puerta-sala-fisica');
    expect(destinoDeTema('exhibicion', museo.salas['sala-fisica']!, HOY)).toBe('exh-exh-pendulo');
  });

  it('finds the curator and the way back only where they exist', () => {
    const sala = museo.salas['sala-fisica']!;
    expect(destinoDeTema('curador', sala, HOY)).toBe(sala.destinos.find((d) => d.tipo === 'curador')?.id);
    expect(destinoDeTema('vestibulo', museo.vestibulo, HOY)).toBeNull();
    expect(destinoDeTema('vestibulo', sala, HOY)).not.toBeNull();
  });

  it('only answers for help and movement (no walking)', () => {
    expect(destinoDeTema('ayuda', museo.vestibulo, HOY)).toBeNull();
    expect(destinoDeTema('moverse', museo.vestibulo, HOY)).toBeNull();
    const ids = temasDeEscena(museo.vestibulo, HOY).map((t) => t.id);
    expect(ids).toContain('ayuda');
    expect(ids).not.toContain('vestibulo');
  });
});

describe('desktop routes', () => {
  it('fills the width only for the walkable museum', () => {
    expect(rutaAPantallaCompleta('/museo')).toBe(true);
    expect(rutaAPantallaCompleta('/museo/sala-fisica')).toBe(true);
    expect(rutaAPantallaCompleta('/museo/lista')).toBe(false);
    expect(rutaAPantallaCompleta('/museo/piedra')).toBe(false);
    expect(rutaAPantallaCompleta('/quipu')).toBe(false);
  });
});

describe('desktop museum (>= 1024 px)', () => {
  beforeEach(() => {
    vi.stubGlobal(
      'matchMedia',
      (q: string) => ({ matches: q.includes('min-width: 1024px'), media: q, addEventListener: () => {}, removeEventListener: () => {}, onchange: null }) as unknown as MediaQueryList,
    );
  });
  afterEach(() => {
    cleanup();
    vi.unstubAllGlobals();
  });

  const abrir = (ruta: string) => {
    const router = createMemoryRouter([...rutas, { path: '*', element: <p>Otra ruta</p> }], { initialEntries: [ruta] });
    render(<RouterProvider router={router} />);
    return router;
  };

  it('shows the world with side panels: destinations, groups, tutor and quipu', () => {
    abrir('/museo/sala-fisica');
    expect(screen.getByRole('heading', { name: 'Sala Física' })).toBeTruthy();
    expect(within(screen.getByRole('navigation', { name: 'Destinos' })).getByRole('button', { name: /El péndulo/ })).toBeTruthy();
    expect(screen.getByRole('heading', { name: /Grupos en la sala/ })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Rikuy, tutor' }).getAttribute('aria-selected')).toBe('true');
    expect(screen.getByRole('heading', { name: 'Quipu del aula' })).toBeTruthy();
    expect(screen.getByRole('button', { name: /Voz en vivo/ }).hasAttribute('disabled')).toBe(true);
  });

  it('answers a guide topic with no target in place', async () => {
    abrir('/museo');
    await userEvent.click(screen.getByRole('button', { name: '¿Cómo nos movemos?' }));
    expect(screen.getAllByRole('status').some((s) => /presionen E/.test(s.textContent ?? ''))).toBe(true);
  });

  it('opens a destination directly when the canvas is unavailable', async () => {
    const router = abrir('/museo');
    await userEvent.click(screen.getByRole('button', { name: /Ir a la sala Física/ }));
    expect(router.state.location.pathname).toBe('/museo/sala-fisica');
  });

  it('refuses unsafe hall chat messages (no phone numbers)', async () => {
    abrir('/museo');
    await userEvent.click(screen.getByRole('tab', { name: 'Charla de cerca' }));
    await userEvent.type(screen.getByLabelText('Mensaje para los grupos cercanos'), 'llamen al 987654321');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByText('No compartas teléfonos ni datos personales')).toBeTruthy();
    await userEvent.clear(screen.getByLabelText('Mensaje para los grupos cercanos'));
    await userEvent.type(screen.getByLabelText('Mensaje para los grupos cercanos'), 'medimos 1.4 s');
    await userEvent.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByText('medimos 1.4 s')).toBeTruthy();
  });
});
