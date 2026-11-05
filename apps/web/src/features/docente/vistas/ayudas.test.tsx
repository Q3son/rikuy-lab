import { cleanup, fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderizarDocente } from '../pruebas.tsx';
import { Ayudas } from './Ayudas.tsx';

afterEach(cleanup);

describe('help board (T-23)', () => {
  const montar = () => renderizarDocente(<Ayudas />, { demo: true, grupos: ['Condor', 'Vizcacha', 'Puma', 'Kantu'] });

  it('shows open, in-progress and closed requests with the pending knot', () => {
    montar();
    expect(screen.getByRole('region', { name: 'Pedidos abiertos' })).toBeTruthy();
    expect(screen.getByText('Grupo Puma pide ayuda')).toBeTruthy();
    expect(screen.getAllByText('Ayuda: Grupo Condor').length).toBe(2);
    expect(screen.getAllByText('Nudo por confirmar').length).toBeGreaterThan(0);
  });

  it('the Ayudante starts off and the teacher can turn it on', () => {
    montar();
    const sw = screen.getByRole('switch', { name: 'Ayudante del museo' }) as HTMLInputElement;
    expect(sw.checked).toBe(false);
    fireEvent.click(sw);
    expect(sw.checked).toBe(true);
  });

  it('confirms a knot and revokes it as a visible correction', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Confirmar nudo' }));
    expect(screen.getByText('Nudo confirmado')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Revocar' }));
    expect(screen.getByText('Nudo corregido (revocado)')).toBeTruthy();
  });

  it('"yo ayudo" moves an open request to the teacher', () => {
    montar();
    fireEvent.click(screen.getByRole('button', { name: 'Yo ayudo' }));
    expect(screen.getByText('Lo atiendes tú')).toBeTruthy();
  });

  it('has no ranking: no counts per group and no ordering words', () => {
    const { container } = montar();
    expect(container.textContent).not.toMatch(/ranking: |mejor|puntos|posición|top \d/i);
    expect(container.textContent).toMatch(/No hay ranking de grupos/);
  });
});
