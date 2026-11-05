import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { renderizarDocente } from '../pruebas.tsx';
import { Evidencias } from './Evidencias.tsx';
import { Hoy } from './Hoy.tsx';
import { Recibir } from './Recibir.tsx';
import { ReporteCompetencia } from './ReporteCompetencia.tsx';
import { ResumenClase } from './ResumenClase.tsx';

afterEach(cleanup);

describe('closing by QR (golden path)', () => {
  it('reads the animated QR of a group, then shows its literal quotes and the Indaga report', async () => {
    renderizarDocente(
      <>
        <Recibir ritmoSimulacionMs={1} />
        <Evidencias />
        <ReporteCompetencia />
      </>,
      { demo: true },
    );
    expect(screen.getByText('Aún no hay evidencia')).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: 'Simular QR de un grupo' }));
    await waitFor(() => expect(screen.getByText(/Recibido: \d+ eventos nuevos/)).toBeTruthy(), { timeout: 4000 });

    const grupo = await screen.findByRole('heading', { name: 'Grupo Condor' });
    const tarjeta = grupo.closest('section') as HTMLElement;
    expect(within(tarjeta).getByText('«si la cuerda es más larga tarda más en volver»')).toBeTruthy();
    expect(within(tarjeta).getAllByText('Frase literal').length).toBe(4);
    // an indicator with no quote says so instead of inventing one
    expect(within(tarjeta).getAllByText('Sin evidencia aún').length).toBe(1);

    expect(screen.getByRole('heading', { name: /Indaga mediante métodos científicos/ })).toBeTruthy();
    expect(screen.getByText(/El resto de cada barra es «sin evidencia aún», no «no logrado»/)).toBeTruthy();
  });

  it('receiving the same group twice does not duplicate anything', async () => {
    const { almacen } = renderizarDocente(<Recibir ritmoSimulacionMs={1} />, { demo: true, grupos: ['Condor'] });
    const antes = almacen.getState().eventos.length;
    almacen.getState().recibirGrupoDeEjemplo('Condor');
    expect(almacen.getState().eventos).toHaveLength(antes);
  });

  it('confirming a quote marks it as confirmed by the teacher', async () => {
    renderizarDocente(<Evidencias />, { demo: true, grupos: ['Condor'] });
    const tarjeta = (await screen.findByRole('heading', { name: 'Grupo Condor' })).closest('section') as HTMLElement;
    const confirmar = within(tarjeta).getAllByRole('button', { name: 'Confirmar' })[0];
    fireEvent.click(confirmar);
    await waitFor(() => expect(within(tarjeta).getAllByText('Confirmada por ti').length).toBeGreaterThan(0));
  });

  it('the group order does not change with the levels', async () => {
    renderizarDocente(<Evidencias />, { demo: true, grupos: ['Kantu', 'Condor', 'Puma'] });
    const nombres = (await screen.findAllByRole('heading', { level: 2 })).map((h) => h.textContent);
    // join order recorded in the log (HLC), whatever order they were received in; not by level
    expect(nombres).toEqual(['Grupo Condor', 'Grupo Puma', 'Grupo Kantu']);
  });
});

describe('class summary and Hoy', () => {
  it('shows the three parts with real quotes', () => {
    renderizarDocente(<ResumenClase />, { demo: true, grupos: ['Condor', 'Vizcacha', 'Puma', 'Kantu'] });
    expect(screen.getByText(/3 de 4 grupos predijeron antes de medir/)).toBeTruthy();
    expect(screen.getByText(/«pesa más y por eso tarda más»/)).toBeTruthy();
    expect(screen.getByRole('heading', { name: '3 · Tres ejercicios para mañana' })).toBeTruthy();
  });

  it('Hoy has the 4-stage stepper, the tutor kill switch and per-group progress', () => {
    const { almacen } = renderizarDocente(<Hoy />, { demo: true, grupos: ['Condor', 'Puma'] });
    expect(screen.getByRole('list', { name: 'Los cuatro tramos del día' }).children).toHaveLength(4);
    expect(screen.getByText('Grupo Puma')).toBeTruthy();
    const sw = screen.getByRole('switch', { name: 'Tutor Rikuy' }) as HTMLInputElement;
    expect(sw.checked).toBe(true);
    fireEvent.click(sw);
    expect(almacen.getState().eventos.at(-1)).toMatchObject({ tipo: 'tutor.interruptor', datos: { activo: false } });
    expect(screen.getByText(/Apagado: hoy trabajan sin Rikuy/)).toBeTruthy();
  });

  it('offers to create a class when there is none', () => {
    renderizarDocente(<Hoy />);
    expect(screen.getByRole('link', { name: 'Crear clase' })).toBeTruthy();
  });
});
