import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import type { ViewerAction } from '@rikuy/holo';
import { ConversacionRikuy } from './ConversacionRikuy.tsx';

afterEach(cleanup);

function escribir(texto: string) {
  fireEvent.change(screen.getByLabelText('Tu respuesta'), { target: { value: texto } });
  fireEvent.click(screen.getByRole('button', { name: 'Enviar' }));
}

describe('ConversacionRikuy (demo del péndulo ante el jurado)', () => {
  it('abre con la pregunta, da pista con "no sé" y evalúa la respuesta siguiente sin repetir la pregunta', () => {
    render(<ConversacionRikuy practica="pendulo" enviar={() => {}} />);
    expect(screen.getAllByText(/oscilará más rápido o más lento/).length).toBeGreaterThan(0);
    escribir('no sé');
    expect(screen.getByText(/Pista 1/)).toBeInTheDocument();
    escribir('más lento');
    expect(screen.getByText(/¿Por qué crees que una cuerda más larga hace que tarde más\?/, { selector: 'p.rounded-lg' })).toBeInTheDocument();
  });

  it('las órdenes de voz llegan al holograma', () => {
    const enviar = vi.fn<(a: ViewerAction) => void>();
    render(<ConversacionRikuy practica="pendulo" enviar={enviar} />);
    escribir('pon la longitud en 2 metros');
    expect(enviar).toHaveBeenCalledWith({ type: 'variable', variable: 'longitud', value: 2 });
    escribir('suéltalo');
    expect(enviar).toHaveBeenCalledWith({ type: 'release' });
  });

  it('"Empezar de nuevo" vuelve a la primera pregunta', () => {
    render(<ConversacionRikuy practica="pendulo" enviar={() => {}} />);
    escribir('más lento');
    fireEvent.click(screen.getByRole('button', { name: 'Empezar de nuevo' }));
    expect(screen.getByText(/oscilará más rápido o más lento/, { selector: 'p.rounded-lg' })).toBeInTheDocument();
  });
});
