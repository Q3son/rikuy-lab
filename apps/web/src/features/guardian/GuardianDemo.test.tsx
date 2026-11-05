import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AutorreporteMomento } from '@rikuy/contracts';
import { GuardianDemo } from './GuardianDemo.tsx';

afterEach(cleanup);

describe('GuardianDemo flow', () => {
  it('shows the notice first, then produces a valid contract AutorreporteMomento', async () => {
    const u = userEvent.setup();
    const onAutorreporte = vi.fn();
    render(<GuardianDemo onAutorreporte={onAutorreporte} />);
    expect(screen.getByText('Guardián activo')).toBeTruthy();
    await u.click(screen.getByRole('button', { name: 'Entendido' }));
    await u.click(screen.getByRole('button', { name: /Curiosidad/ }));
    await u.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onAutorreporte).toHaveBeenCalledTimes(1);
    expect(AutorreporteMomento.safeParse(onAutorreporte.mock.calls[0]?.[0]).success).toBe(true);
    expect(screen.getByText('Pulso del curso')).toBeTruthy();
  });

  it('"Necesito hablar" produces a help request addressed by the student', async () => {
    const u = userEvent.setup();
    const onPedido = vi.fn();
    render(<GuardianDemo onPedido={onPedido} />);
    await u.click(screen.getByRole('button', { name: 'Entendido' }));
    await u.click(screen.getByRole('button', { name: 'Necesito hablar' }));
    await u.click(screen.getByRole('button', { name: 'Avisar' }));
    expect(onPedido).toHaveBeenCalledWith(expect.objectContaining({ destino: 'docente', urgente: false }));
  });

  it('the kill switch turns Guardián off and says everything keeps working', async () => {
    const u = userEvent.setup();
    render(<GuardianDemo />);
    await u.click(screen.getByRole('button', { name: 'Apagar Guardián' }));
    expect(screen.getByText(/Todo funciona igual/)).toBeTruthy();
  });
});
