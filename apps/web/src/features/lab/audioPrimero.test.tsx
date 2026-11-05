import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { RegistroLab } from './datos/registro.ts';
import { crearSesion } from './datos/sesion.ts';
import { PaginaPractica } from './PaginaPractica.tsx';
import { ModeloTutorSimulado } from './tutorMock.ts';

const speak = vi.fn((_t: string, _r?: number) => true);
let oido: string | null = 'diez coma tres';
vi.mock('../../platform/voz/speech.ts', () => ({
  recognitionSupported: () => true,
  speechAvailable: () => true,
  speak: (t: string, r?: number) => speak(t, r),
  listenOnce: () => ({ result: Promise.resolve(oido), cancel: () => {} }),
}));
vi.mock('@rikuy/holo', () => ({ VisorExhibicion: () => null }));

beforeEach(() => {
  speak.mockClear();
  localStorage.clear();
  oido = 'diez coma tres';
});
afterEach(cleanup);

function setup() {
  render(
    <MemoryRouter initialEntries={['/lab/pendulo']}>
      <Routes>
        <Route path="/lab/:practicaId" element={<PaginaPractica registro={new RegistroLab(crearSesion(null), `a-${Math.random()}`)} tutor={new ModeloTutorSimulado()} />} />
      </Routes>
    </MemoryRouter>,
  );
}

async function predecir() {
  fireEvent.click(await screen.findByRole('radio', { name: 'Largo de la cuerda' }));
  fireEvent.change(screen.getByLabelText(/¿Qué pasará\?/), { target: { value: 'tarda más' } });
  fireEvent.click(screen.getByRole('button', { name: /Guardar predicción/ }));
  await screen.findByRole('timer');
}

describe('Dicta tu dato', () => {
  it('parses the spoken time, echoes it on screen and aloud, and saves only after confirming', async () => {
    setup();
    await predecir();
    fireEvent.click(screen.getByRole('button', { name: /Dicta tu dato/ }));
    expect(await screen.findByText('Escuché 10,3 segundos. ¿Lo guardo?')).toBeTruthy();
    expect(speak).toHaveBeenCalledWith('Escuché 10,3 segundos. ¿Lo guardo?', 1);
    expect(screen.queryByRole('table', { name: /Tus mediciones/ })).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: /Sí, guardar/ }));
    const tabla = await screen.findByRole('table', { name: /Tus mediciones/ });
    expect(within(tabla).getByRole('cell', { name: '1,03' })).toBeTruthy();
  });

  it('asks again when it did not understand, and the typed field stays available', async () => {
    oido = 'no sé';
    setup();
    await predecir();
    fireEvent.click(screen.getByRole('button', { name: /Dicta tu dato/ }));
    expect(await screen.findByText(/No entendí un tiempo/)).toBeTruthy();
    expect(screen.getByLabelText(/Tiempo de 10 oscilaciones/)).toBeTruthy();
  });

  it('echoes the typed time aloud (keypad with audio echo)', async () => {
    setup();
    await predecir();
    fireEvent.change(screen.getByLabelText(/Tiempo de 10 oscilaciones/), { target: { value: '14,2' } });
    fireEvent.click(screen.getByRole('button', { name: /Escuchar lo que escribí/ }));
    expect(speak).toHaveBeenCalledWith('14,2 segundos', 1);
  });
});

describe('audio-first mode', () => {
  it('reads the guiding question aloud when turned on, at the chosen speed', async () => {
    setup();
    fireEvent.click(await screen.findByRole('switch', { name: /Modo audio/ }));
    fireEvent.click(screen.getByRole('radio', { name: '0,75x' }));
    fireEvent.click(screen.getByRole('button', { name: /Escuchar la pregunta/ }));
    expect(speak).toHaveBeenLastCalledWith('¿De qué depende el tiempo que tarda el péndulo en ir y volver?', 0.75);
  });
});
