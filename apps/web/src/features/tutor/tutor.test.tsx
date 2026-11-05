import { cleanup, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, describe, expect, it } from 'vitest';
import { rutas as rutasApp } from '../../app/rutas.tsx';
import { PRACTICA_DEMO, visorSimulado } from './demo.ts';
import { rutas } from './rutas.ts';
import { TutorPanel } from './TutorPanel.tsx';

afterEach(cleanup);

const montar = (props: Partial<Parameters<typeof TutorPanel>[0]> = {}) =>
  render(<TutorPanel practica={PRACTICA_DEMO} visor={visorSimulado()} grupoId="G1" eventosInterruptor={[]} {...props} />);

async function decir(texto: string) {
  const user = userEvent.setup();
  await user.type(screen.getByRole('textbox', { name: /escribe/i }), texto);
  await user.click(screen.getByRole('button', { name: /enviar/i }));
}

describe('tutor feature routes', () => {
  it('exposes the /tutor route and the app mounts it', async () => {
    expect(rutas.map((r) => r.path)).toEqual(['tutor']);
    render(<RouterProvider router={createMemoryRouter(rutasApp, { initialEntries: ['/tutor'] })} />);
    expect(await screen.findByRole('heading', { name: /tutor rikuy/i })).toBeTruthy();
  });
});

describe('TutorPanel (container + presentational)', () => {
  it('shows the student message, the tutor reply and the source badge', async () => {
    montar();
    await decir('dame una pista');
    expect(await screen.findByText(/Te doy una pista, no la respuesta/)).toBeTruthy();
    expect(screen.getAllByText('Reglas').length).toBeGreaterThan(0);
  });

  it('confirms an action only after the viewer answered OK', async () => {
    montar();
    await decir('pausa');
    await screen.findByText(/Voy a pausar la simulación/);
    expect(await screen.findByText(/Listo: pausé la simulación/)).toBeTruthy();
  });

  it('admits failure when the viewer fails: "no pude", never "listo"', async () => {
    montar({ visor: visorSimulado({ falla: 'pausar' }) });
    await decir('pausa');
    expect(await screen.findByText(/No pude pausar la simulación/)).toBeTruthy();
    expect(screen.queryByText(/Listo: pausé/)).toBeNull();
  });

  it('the hint ladder advances between turns', async () => {
    montar();
    await decir('dame una pista');
    await screen.findByText(new RegExp(PRACTICA_DEMO.pistas[0]!.slice(0, 20)));
    await decir('otra pista');
    expect(await screen.findByText(new RegExp(PRACTICA_DEMO.pistas[1]!.slice(0, 20)))).toBeTruthy();
  });

  it('kill switch: "modo cuaderno", the tutor stays silent', async () => {
    montar({ eventosInterruptor: [{ hlc: '1762300800000-0000-docente1', datos: { activo: false } }] });
    expect(screen.getByText(/modo cuaderno/i)).toBeTruthy();
    expect(screen.getByText(new RegExp(PRACTICA_DEMO.preguntaGuia.slice(0, 20)))).toBeTruthy(); // guiding question stays
    expect(screen.queryByRole('textbox', { name: /escribe/i })).toBeNull();
    expect(screen.queryByRole('button', { name: /enviar/i })).toBeNull();
  });

  it('switching the tutor off while open silences it immediately', async () => {
    const { rerender } = montar();
    await decir('hola');
    await screen.findByText(/soy Rikuy/);
    rerender(<TutorPanel practica={PRACTICA_DEMO} visor={visorSimulado()} grupoId="G1" eventosInterruptor={[{ hlc: '1762300800000-0000-docente1', datos: { activo: false } }]} />);
    await waitFor(() => expect(screen.getByText(/modo cuaderno/i)).toBeTruthy());
  });

  it('emits tutor.turno data (source badge) for the event log', async () => {
    const turnos: unknown[] = [];
    montar({ onTurno: (d) => turnos.push(d) });
    await decir('hola');
    await waitFor(() => expect(turnos).toHaveLength(1));
    expect(turnos[0]).toMatchObject({ grupoId: 'G1', fuente: 'reglas' });
  });

  it('"la masa" does not register a hypothesis', async () => {
    const turnos: Array<{ comandos: Array<{ tool: string }> }> = [];
    montar({ onTurno: (d) => turnos.push(d as never) });
    await decir('la masa del péndulo es de 200 gramos');
    await waitFor(() => expect(turnos).toHaveLength(1));
    expect(turnos[0]!.comandos.some((c) => c.tool === 'registrar_hipotesis')).toBe(false);
  });
});
