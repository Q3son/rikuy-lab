import { act, cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CheckInMomento, type SalidaCheckIn } from './CheckInMomento.tsx';

afterEach(cleanup);

function montar(props: Partial<React.ComponentProps<typeof CheckInMomento>> = {}) {
  const onResultado = vi.fn<(r: SalidaCheckIn) => void>();
  const onNecesitoHablar = vi.fn();
  const onAvisoVisto = vi.fn();
  render(
    <CheckInMomento
      pasoEtiqueta="medir 10 oscilaciones"
      requiereAviso={false}
      onAvisoVisto={onAvisoVisto}
      onResultado={onResultado}
      onNecesitoHablar={onNecesitoHablar}
      {...props}
    />,
  );
  return { onResultado, onNecesitoHablar, onAvisoVisto };
}

describe('CheckInMomento', () => {
  it('is anchored to the exact step and asks the question', () => {
    montar();
    expect(screen.getByText(/en: medir 10 oscilaciones/i)).toBeTruthy();
    expect(screen.getByText('¿Cómo vas con esto?')).toBeTruthy();
  });

  it('shows the confidentiality notice first and only continues after "Entendido"', async () => {
    const u = userEvent.setup();
    const { onAvisoVisto } = montar({ requiereAviso: true });
    expect(screen.getByText(/La confidencialidad no es absoluta/)).toBeTruthy();
    expect(screen.queryByRole('group', { name: /energía/i })).toBeNull();
    await u.click(screen.getByRole('button', { name: 'Entendido' }));
    expect(onAvisoVisto).toHaveBeenCalled();
  });

  it('lets the student pick several emotions, asks an intensity for each and submits', async () => {
    const u = userEvent.setup();
    const { onResultado } = montar();
    await u.click(screen.getByRole('button', { name: /Curiosidad/ }));
    await u.click(screen.getByRole('button', { name: /Cansancio/ }));
    const intensidadCuriosidad = screen.getByRole('radiogroup', { name: /Intensidad de Curiosidad/ });
    await u.click(within(intensidadCuriosidad).getByRole('radio', { name: 'mucho' }));
    await u.click(within(screen.getByRole('radiogroup', { name: /Intensidad de Cansancio/ })).getByRole('radio', { name: 'poco' }));
    await u.click(screen.getByRole('radio', { name: 'una pista' }));
    await u.click(screen.getByRole('radio', { name: 'compartir con mi profe' }));
    await u.type(screen.getByLabelText(/Si quieres, cuéntanos/), 'Me cuesta contar');
    await u.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(onResultado).toHaveBeenCalledWith({
      tipo: 'respuesta',
      datos: {
        emociones: [
          { emocion: 'curiosidad', intensidad: 'mucho' },
          { emocion: 'cansancio', intensidad: 'poco' },
        ],
        ayuda: 'pista',
        texto: 'Me cuesta contar',
        visibilidad: 'mi_docente',
      },
    });
  });

  it('defaults to the private choice and never pre-selects help', async () => {
    const u = userEvent.setup();
    const { onResultado } = montar();
    expect(screen.getByRole('radio', { name: 'solo yo' })).toHaveProperty('checked', true);
    await u.click(screen.getByRole('button', { name: /Calma/ }));
    await u.click(screen.getByRole('button', { name: 'Enviar' }));
    const arg = onResultado.mock.calls[0]?.[0];
    expect(arg).toMatchObject({ tipo: 'respuesta', datos: { visibilidad: 'solo_yo' } });
    expect((arg as { datos: { ayuda?: string } }).datos.ayuda).toBeUndefined();
  });

  it('cannot send an empty selection', () => {
    montar();
    expect((screen.getByRole('button', { name: 'Enviar' }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('"No sé" and "Prefiero no decir" are first-class answers', async () => {
    const u = userEvent.setup();
    const a = montar();
    await u.click(screen.getByRole('button', { name: 'No sé' }));
    expect(a.onResultado).toHaveBeenCalledWith({ tipo: 'no_se' });
    cleanup();
    const b = montar();
    await u.click(screen.getByRole('button', { name: 'Prefiero no decir' }));
    expect(b.onResultado).toHaveBeenCalledWith({ tipo: 'prefiero_no_decir' });
  });

  it('can always be skipped at no cost', async () => {
    const u = userEvent.setup();
    const { onResultado } = montar();
    await u.click(screen.getByRole('button', { name: 'Ahora no' }));
    expect(onResultado).toHaveBeenCalledWith({ tipo: 'omitido' });
  });

  it('exposes "Necesito hablar" at any time without passing through the grid', async () => {
    const u = userEvent.setup();
    const { onNecesitoHablar } = montar();
    await u.click(screen.getByRole('button', { name: 'Necesito hablar' }));
    expect(onNecesitoHablar).toHaveBeenCalled();
  });

  it('every emotion cell has a word and a shape, never color alone', () => {
    montar();
    for (const b of screen.getAllByRole('button', { pressed: false })) {
      expect(b.querySelector('svg[aria-hidden="true"]')).not.toBeNull();
      expect((b.textContent ?? '').trim().length).toBeGreaterThan(2);
    }
  });

  it('expires as skipped when the answer window closes', () => {
    vi.useFakeTimers();
    const { onResultado } = montar({ ventanaMs: 5000 });
    act(() => {
      vi.advanceTimersByTime(5001);
    });
    expect(onResultado).toHaveBeenCalledWith({ tipo: 'omitido' });
    vi.useRealTimers();
  });

  it('does not render any previous answer (shared phone)', async () => {
    const u = userEvent.setup();
    montar();
    await u.click(screen.getByRole('button', { name: /Alegría/ }));
    await u.click(screen.getByRole('button', { name: 'Enviar' }));
    expect(screen.getByText(/Gracias/)).toBeTruthy();
    expect(screen.queryByRole('button', { name: /Alegría/ })).toBeNull();
    expect(screen.queryByText(/Alegría/)).toBeNull();
  });
});
