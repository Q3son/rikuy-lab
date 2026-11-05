import { render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { expectSinViolacionesGraves } from '../testing/axe.ts';
import { ConstructorFrases, type Pictograma } from './constructor-frases.tsx';

const PICTOGRAMAS: Pictograma[] = [
  { id: 'creo', label: 'creo que', icono: <svg /> },
  { id: 'cuerda', label: 'la cuerda', icono: <svg /> },
  { id: 'larga', label: 'larga', icono: <svg /> },
  { id: 'tarda', label: 'tarda más', icono: <svg /> },
];

const ETIQUETAS = {
  titulo: 'Arma una frase',
  paleta: 'Pictogramas para elegir',
  frase: 'Tu frase',
  vacio: 'Toca un pictograma para empezar.',
  quitarUltimo: 'Quitar el último',
  borrar: 'Borrar todo',
  confirmar: 'Usar esta frase',
  quitar: (palabra: string) => `Quitar ${palabra}`,
};

function Prueba({ onConfirmar = () => {} }: { onConfirmar?: (ids: string[]) => void }) {
  const [valor, setValor] = useState<string[]>([]);
  return <ConstructorFrases pictogramas={PICTOGRAMAS} value={valor} onChange={setValor} onConfirmar={onConfirmar} etiquetas={ETIQUETAS} />;
}

describe('pictogram sentence builder', () => {
  it('starts empty with an invitation and a disabled confirm button', () => {
    render(<Prueba />);
    expect(screen.getByText('Toca un pictograma para empezar.')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Usar esta frase' })).toBeDisabled();
  });

  it('builds the sentence by tapping pictograms and always shows it as text too', async () => {
    render(<Prueba />);
    for (const nombre of ['creo que', 'la cuerda', 'larga', 'tarda más']) await userEvent.click(screen.getByRole('button', { name: nombre }));
    expect(screen.getByTestId('frase-texto')).toHaveTextContent('creo que la cuerda larga tarda más');
    const lista = screen.getByRole('list', { name: 'Tu frase' });
    expect(within(lista).getAllByRole('listitem')).toHaveLength(4);
  });

  it('removes the last pictogram, one in the middle, or all of them', async () => {
    render(<Prueba />);
    for (const nombre of ['creo que', 'la cuerda', 'larga']) await userEvent.click(screen.getByRole('button', { name: nombre }));
    await userEvent.click(screen.getByRole('button', { name: 'Quitar el último' }));
    expect(screen.getByTestId('frase-texto')).toHaveTextContent('creo que la cuerda');
    await userEvent.click(screen.getByRole('button', { name: 'Quitar creo que' }));
    expect(screen.getByTestId('frase-texto')).toHaveTextContent('la cuerda');
    await userEvent.click(screen.getByRole('button', { name: 'Borrar todo' }));
    expect(screen.getByText('Toca un pictograma para empezar.')).toBeInTheDocument();
  });

  it('confirms with the ordered ids', async () => {
    const onConfirmar = vi.fn();
    render(<Prueba onConfirmar={onConfirmar} />);
    await userEvent.click(screen.getByRole('button', { name: 'larga' }));
    await userEvent.click(screen.getByRole('button', { name: 'la cuerda' }));
    await userEvent.click(screen.getByRole('button', { name: 'Usar esta frase' }));
    expect(onConfirmar).toHaveBeenCalledWith(['larga', 'cuerda']);
  });

  it('every control is a 48 px target and the palette is a labelled group', () => {
    render(<Prueba />);
    expect(screen.getByRole('group', { name: 'Pictogramas para elegir' })).toBeInTheDocument();
    for (const boton of screen.getAllByRole('button')) expect(boton.className).toMatch(/min-h-12|min-h-16|h-12|h-14|size-12/);
  });

  it('can read the sentence aloud through the narration button', async () => {
    const onToggle = vi.fn();
    render(
      <ConstructorFrases
        pictogramas={PICTOGRAMAS}
        value={['creo', 'cuerda']}
        onChange={() => {}}
        etiquetas={ETIQUETAS}
        narracion={{ hablando: false, onToggle, hablarLabel: 'Escuchar', detenerLabel: 'Detener' }}
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Escuchar' }));
    expect(onToggle).toHaveBeenCalledOnce();
  });

  it('has no serious accessibility violations', async () => {
    const { container } = render(
      <main>
        <Prueba />
      </main>,
    );
    await expectSinViolacionesGraves(container);
  });
});
