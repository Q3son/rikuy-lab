import { expectSinViolacionesGraves } from '@rikuy/ui/testing';
import { act, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { useAjustesA11y } from '../shell/accesibilidad/ajustes.ts';
import { renderApp } from '../test-utils.tsx';

const GRUPO = { rol: 'grupo', codigo: 'ABC123', apodo: 'Puma' } as const;

describe('single-tap scanning inside the app', () => {
  it('turning it on from the accessibility panel shows the scan bar and highlights a control', async () => {
    await renderApp('/yo', GRUPO);
    expect(screen.queryByRole('region', { name: 'Barrido activo' })).toBeNull();
    await userEvent.click(screen.getByRole('switch', { name: 'Barrido con un toque' }));
    expect(await screen.findByRole('region', { name: 'Barrido activo' })).toBeInTheDocument();
    expect(document.querySelectorAll('[data-barrido-actual]')).toHaveLength(1);
    expect(document.documentElement).toHaveAttribute('data-barrido');
  });

  it('the bar lets the person leave the mode with a normal tap', async () => {
    await renderApp('/yo', GRUPO);
    act(() => useAjustesA11y.getState().fijar({ barrido: true }));
    await userEvent.click(await screen.findByRole('button', { name: 'Salir del barrido' }));
    expect(useAjustesA11y.getState().barrido).toBe(false);
    expect(screen.queryByRole('region', { name: 'Barrido activo' })).toBeNull();
  });

  it('has no serious accessibility violations while scanning', async () => {
    const { container } = await renderApp('/museo', GRUPO);
    act(() => useAjustesA11y.getState().fijar({ barrido: true }));
    await screen.findByRole('region', { name: 'Barrido activo' });
    await expectSinViolacionesGraves(container);
  });
});
