import { expectSinViolacionesGraves } from '@rikuy/ui/testing';
import { act, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, it } from 'vitest';
import { renderApp } from '../../test-utils.tsx';
import { useSesion } from '../sesion.ts';

const GRUPO = { rol: 'grupo', codigo: 'ABC123', apodo: 'Puma' } as const;

describe('Lab: pictogram sentence builder (level of support)', () => {
  it('lets a group say a prediction by tapping pictograms, and shows it as text', async () => {
    await renderApp('/lab/inicio', GRUPO);
    for (const nombre of ['creo que', 'la cuerda', 'larga', 'tarda', 'más']) await userEvent.click(screen.getByRole('button', { name: nombre }));
    expect(screen.getByTestId('frase-texto')).toHaveTextContent('creo que la cuerda larga tarda más');
    await userEvent.click(screen.getByRole('button', { name: 'Usar esta frase' }));
    expect(await screen.findByText('Frase lista')).toBeInTheDocument();
    expect(screen.getAllByText('creo que la cuerda larga tarda más').length).toBeGreaterThanOrEqual(1);
  });

  it('every pictogram carries its word and the sentence can be read aloud', async () => {
    await renderApp('/lab/inicio', GRUPO);
    const paleta = screen.getByRole('group', { name: 'Pictogramas para elegir' });
    expect(within(paleta).getAllByRole('button')).toHaveLength(11);
    expect(within(screen.getByRole('region', { name: 'Arma una frase' })).getAllByRole('button', { name: 'Escuchar' }).length).toBeGreaterThanOrEqual(1);
  });

  it('with the level "con apoyo" the builder comes before everything else', async () => {
    await renderApp('/lab/inicio', GRUPO);
    act(() => useSesion.getState().fijarNivel('apoyo'));
    await waitFor(() => expect(screen.getAllByRole('heading', { level: 2 })[0]).toHaveTextContent('Arma una frase'));
  });

  it('without support the builder is below the continue card', async () => {
    await renderApp('/lab/inicio', GRUPO);
    const encabezados = screen.getAllByRole('heading', { level: 2 });
    expect(encabezados[0]).toHaveTextContent('Aún no empiezas una exhibición');
  });

  it('has no serious accessibility violations', async () => {
    const { container } = await renderApp('/lab/inicio', GRUPO);
    await userEvent.click(screen.getByRole('button', { name: 'creo que' }));
    await expectSinViolacionesGraves(container);
  });
});
