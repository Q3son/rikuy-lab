import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BotonesTactiles, ControlesPendulo, EstadoCamara, GestoReconocido, GuiaGestos } from './componentes.tsx';

afterEach(cleanup);

describe('BotonesTactiles primary button', () => {
  it('says "Soltar el péndulo" for the pendulum scene (and when the scene is unknown)', () => {
    render(<BotonesTactiles enviar={() => {}} escena="pendulo" />);
    expect(screen.getByRole('button', { name: /Soltar el péndulo/ })).toBeTruthy();
    cleanup();
    render(<BotonesTactiles enviar={() => {}} />);
    expect(screen.getByRole('button', { name: /Soltar el péndulo/ })).toBeTruthy();
  });

  it.each(['lactasa', 'respiratorio'])('does not talk about the pendulum on the %s scene, and still runs the scene', async (escena) => {
    const enviar = vi.fn();
    render(<BotonesTactiles enviar={enviar} escena={escena} />);
    expect(screen.queryByText(/péndulo/)).toBeNull();
    await userEvent.click(screen.getByRole('button', { name: /Reanudar la animación/ }));
    expect(enviar).toHaveBeenCalledWith({ type: 'release' });
  });
});

describe('GuiaGestos and EstadoCamara talk about the scene on screen', () => {
  it('on the pendulum the thumbs-up releases the pendulum', () => {
    localStorage.clear();
    render(<GuiaGestos escena="pendulo" />);
    expect(screen.getByText('Pulgar arriba: soltar el péndulo')).toBeTruthy();
  });

  it.each(['lactasa', 'respiratorio'])('on %s the thumbs-up resumes the animation, no pendulum', (escena) => {
    localStorage.clear();
    render(<GuiaGestos escena={escena} />);
    expect(screen.getByText('Pulgar arriba: reanudar la animación')).toBeTruthy();
    expect(screen.queryByText(/péndulo/)).toBeNull();
    cleanup();
    render(<EstadoCamara status="active" pose="thumbs_up" escena={escena} />);
    expect(screen.queryByText(/péndulo|soltar/)).toBeNull();
  });
});

describe('GestoReconocido (big feedback on the control phone)', () => {
  it('shows the recognized pose in words, big', () => {
    render(<GestoReconocido pose="pinch" escena="pendulo" />);
    expect(screen.getByRole('status').textContent).toContain('Pellizco');
  });

  it('announces the order a gesture just fired', () => {
    render(<GestoReconocido pose="thumbs_up" escena="pendulo" disparo={{ texto: 'Soltar el péndulo', n: 1 }} />);
    expect(screen.getByRole('status').textContent).toContain('Soltar el péndulo');
  });

  it('asks for the hand when none is seen', () => {
    render(<GestoReconocido pose={null} escena="pendulo" />);
    expect(screen.getByRole('status').textContent).toContain('Muestra tu mano');
  });
});

describe('ControlesPendulo', () => {
  it('sends the chosen length and the damping switch', async () => {
    const enviar = vi.fn();
    render(<ControlesPendulo enviar={enviar} longitud={0.5} amortiguacion={false} />);
    await userEvent.click(screen.getByRole('button', { name: '1 m' }));
    expect(enviar).toHaveBeenCalledWith({ type: 'variable', variable: 'longitud', value: 1 });
    expect(screen.getByRole('button', { name: '0.5 m' }).getAttribute('aria-pressed')).toBe('true');
    await userEvent.click(screen.getByRole('switch', { name: /rozamiento/i }));
    expect(enviar).toHaveBeenCalledWith({ type: 'variable', variable: 'amortiguacion', value: 1 });
  });
});
