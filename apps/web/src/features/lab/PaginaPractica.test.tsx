import 'fake-indexeddb/auto';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { RegistroLab } from './datos/registro.ts';
import { crearSesion } from './datos/sesion.ts';
import { PaginaPractica } from './PaginaPractica.tsx';
import { ModeloTutorSimulado } from './tutorMock.ts';

vi.mock('@rikuy/holo', () => ({ VisorExhibicion: () => <div data-testid="visor" /> }));

afterEach(cleanup);

function setup() {
  const sesion = crearSesion(null);
  const registro = new RegistroLab(sesion, `practica-${Math.random()}`);
  render(
    <MemoryRouter initialEntries={['/lab/pendulo']}>
      <Routes>
        <Route path="/lab/:practicaId" element={<PaginaPractica registro={registro} tutor={new ModeloTutorSimulado()} />} />
      </Routes>
    </MemoryRouter>,
  );
  return { registro };
}

async function predecir() {
  fireEvent.click(await screen.findByRole('radio', { name: 'Largo de la cuerda' }));
  fireEvent.change(screen.getByLabelText(/¿Qué pasará\?/), { target: { value: 'Si alargo la cuerda, tarda más' } });
  fireEvent.change(screen.getByLabelText(/¿Por qué lo crees\?/), { target: { value: 'recorre más camino' } });
  fireEvent.click(screen.getByRole('button', { name: /Guardar predicción/ }));
}

async function medirManual(cm: string, segundos: string) {
  fireEvent.click(await screen.findByRole('radio', { name: cm }));
  fireEvent.change(screen.getByLabelText(/Tiempo de 10 oscilaciones/), { target: { value: segundos } });
  fireEvent.click(screen.getByRole('button', { name: /Guardar esta medida/ }));
  const periodo = new Intl.NumberFormat('es', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(Number(segundos) / 10);
  const tabla = await screen.findByRole('table', { name: /Tus mediciones/ });
  await within(tabla).findByRole('cell', { name: periodo });
}

describe('pendulum practice page', () => {
  it('GATE: there is no way to measure before the prediction', async () => {
    setup();
    expect(await screen.findByText('Si alargas la cuerda, ¿el péndulo irá más rápido o más lento?')).toBeTruthy();
    expect(screen.queryByRole('timer')).toBeNull();
    expect(screen.queryByRole('button', { name: /Guardar esta medida/ })).toBeNull();
    expect((screen.getByRole('button', { name: /Guardar predicción/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it('runs the whole practice and persists every event', async () => {
    const { registro } = setup();
    await predecir();
    expect(await screen.findByRole('timer')).toBeTruthy();
    expect(screen.getByText(/Mi hipótesis/)).toBeTruthy();
    expect(await screen.findByText(/¿Cómo vas a comprobarlo\?/)).toBeTruthy(); // mocked tutor
    await medirManual('25 cm', '10.3');
    await medirManual('50 cm', '14.2');
    await medirManual('100 cm', '20.9');
    await medirManual('200 cm', '28.4');

    fireEvent.click(screen.getByRole('button', { name: /Comparar con el modelo/ }));
    const tabla = await screen.findByRole('table', { name: /Comparación con el modelo/ });
    expect(within(tabla).getByRole('cell', { name: '2,09' })).toBeTruthy();
    expect(within(tabla).getByRole('cell', { name: '2,01' })).toBeTruthy(); // T = 2π√(1/9.80665)
    expect(screen.getByRole('img', { name: /Gráfica/ })).toBeTruthy();

    fireEvent.click(screen.getByRole('radio', { name: /100 cm: 2,09 s/ }));
    fireEvent.change(screen.getByLabelText(/Mi conclusión/), { target: { value: 'Con 100 cm tardó 2,09 s y con 25 cm 1,03 s: más larga, más lento.' } });
    fireEvent.click(screen.getByRole('button', { name: /Guardar conclusión/ }));
    expect(await screen.findByText(/Práctica terminada/)).toBeTruthy();

    await waitFor(async () => expect((await registro.todos()).map((e) => e.tipo)).toEqual([
      'respuesta.registrada', 'medicion.registrada', 'medicion.registrada', 'medicion.registrada', 'medicion.registrada', 'respuesta.registrada',
    ]));
  });

  it('loads the hologram only when asked', async () => {
    setup();
    await predecir();
    expect(screen.queryByTestId('visor')).toBeNull();
    fireEvent.click(await screen.findByRole('button', { name: /Ver el holograma/ }));
    expect(await screen.findByTestId('visor')).toBeTruthy();
  });
});
