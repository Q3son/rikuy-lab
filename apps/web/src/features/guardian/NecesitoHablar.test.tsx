import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { NecesitoHablar } from './NecesitoHablar.tsx';

afterEach(cleanup);

describe('NecesitoHablar', () => {
  it('asks only who the student wants to talk to, with no justification needed', async () => {
    const u = userEvent.setup();
    const onPedir = vi.fn();
    render(<NecesitoHablar onPedir={onPedir} onCancelar={() => {}} />);
    await u.click(screen.getByRole('radio', { name: 'otro adulto del colegio' }));
    await u.click(screen.getByRole('button', { name: 'Avisar' }));
    expect(onPedir).toHaveBeenCalledWith({ destino: 'otro_adulto', urgente: false });
  });

  it('defaults to the teacher and marks urgency only when the student says it', async () => {
    const u = userEvent.setup();
    const onPedir = vi.fn();
    render(<NecesitoHablar onPedir={onPedir} onCancelar={() => {}} />);
    await u.click(screen.getByRole('checkbox', { name: /Alguien me hace daño o estoy en peligro/ }));
    await u.click(screen.getByRole('button', { name: 'Avisar' }));
    expect(onPedir).toHaveBeenCalledWith({ destino: 'docente', urgente: true });
  });

  it('shows the confidentiality notice and can be cancelled', async () => {
    const u = userEvent.setup();
    const onCancelar = vi.fn();
    render(<NecesitoHablar onPedir={() => {}} onCancelar={onCancelar} />);
    expect(screen.getByText(/La confidencialidad no es absoluta/)).toBeTruthy();
    await u.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(onCancelar).toHaveBeenCalled();
  });
});
