import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { BotonesTactiles } from './componentes.tsx';

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
