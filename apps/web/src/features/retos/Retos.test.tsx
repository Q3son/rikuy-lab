import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { registroMuseo } from '../mundo/eventos.ts';
import { rutas } from './rutas.ts';

afterEach(cleanup);
const abrir = (ruta: string) => render(<RouterProvider router={createMemoryRouter(rutas, { initialEntries: [ruta] })} />);

describe('Patio de juegos', () => {
  it('lists the feria, chacra and llamas challenges', () => {
    abrir('/retos');
    for (const t of ['Feria de Chivay', 'Riego en la chacra', 'Cuenta llamas']) {
      expect(screen.getByRole('link', { name: `Jugar «${t}»` })).toBeTruthy();
    }
  });

  it('answers a wrong try with a question, shows the hint after two tries and records group progress', async () => {
    abrir('/retos/feria');
    const campo = await screen.findByLabelText('Respuesta (soles)');
    await userEvent.type(campo, '9{Enter}');
    expect(screen.getByRole('status').textContent).toMatch(/\?/);
    await userEvent.clear(campo);
    await userEvent.type(campo, '8{Enter}');
    expect(screen.getByText(/^Pista:/)).toBeTruthy();
    await userEvent.clear(campo);
    await userEvent.type(campo, '6{Enter}');
    expect(await screen.findByText('Paso 2 de 3')).toBeTruthy();
    expect(registroMuseo.eventos.at(-1)).toMatchObject({ tipo: 'reto.progreso', datos: { retoId: 'feria', paso: 1, completado: false } });
    expect(document.body.textContent).not.toMatch(/puntaje|puntos|ranking/i);
  });
});
