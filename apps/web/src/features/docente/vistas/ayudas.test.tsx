import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { useAyudante } from '../../mundo/ayudante/servicio.ts';
import { renderizarDocente } from '../pruebas.tsx';
import { Ayudas } from './Ayudas.tsx';

beforeEach(() => useAyudante.getState().reiniciar());
afterEach(cleanup);

describe('help board (T-23): the museum Ayudante board embedded in the panel', () => {
  it('shows the board under the panel heading, without its own page landmark or museum link', () => {
    renderizarDocente(<Ayudas />, { demo: true });
    expect(screen.getByRole('heading', { level: 2, name: 'Tablero de ayudas entre grupos' })).toBeTruthy();
    expect(screen.queryByRole('main')).toBeNull();
    expect(screen.queryByRole('link', { name: 'Ir al museo' })).toBeNull();
  });

  it('drives the same Ayudante state as the groups: the teacher turns it on', () => {
    renderizarDocente(<Ayudas />, { demo: true });
    expect(useAyudante.getState().estado.config.activo).toBe(false);
    fireEvent.click(screen.getByRole('checkbox', { name: /Ayudante del museo/ }));
    expect(useAyudante.getState().estado.config.activo).toBe(true);
  });
});
