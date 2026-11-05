import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { RouterProvider, createMemoryRouter } from 'react-router';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { registroMuseo } from '../eventos.ts';
import { GRUPO_DEMO } from '../grupo.ts';
import { rutas } from '../rutas.ts';
import { juzgarFrase, useAyudante } from './servicio.ts';
import { TableroAyudas } from './TableroAyudas.tsx';

const abrir = (ruta: string) =>
  render(<RouterProvider router={createMemoryRouter([...rutas, { path: '*', element: <p>Otra ruta</p> }], { initialEntries: [ruta] })} />);

beforeEach(() => useAyudante.getState().reiniciar());
afterEach(cleanup);

describe('Ayudante del museo (student side)', () => {
  it('is hidden while the teacher switch is off (default)', () => {
    abrir('/museo/sala-fisica');
    expect(screen.queryByRole('heading', { name: 'Ayudante del museo' })).toBeNull();
  });

  it('asks with fixed chips after offering Rikuy’s hint first, then closes "con tus palabras"', async () => {
    useAyudante.getState().despachar({ tipo: 'configurar', activo: true });
    abrir('/museo/sala-fisica');
    await userEvent.click(screen.getByRole('button', { name: 'Pedir ayuda a otro grupo' }));
    expect(screen.getByText(/Rikuy primero/)).toBeTruthy();
    await userEvent.click(screen.getByRole('button', { name: 'Saltar la pista' }));
    expect(screen.queryByRole('textbox')).toBeNull(); // no free text in the request
    await userEvent.click(screen.getByRole('button', { name: 'Longitud y periodo' }));
    await userEvent.click(screen.getByRole('button', { name: 'Que me lo expliquen con otras palabras' }));
    await userEvent.click(screen.getByRole('button', { name: 'Enviar pedido' }));
    expect(screen.getByText(/busca un grupo que ya lo razonó/)).toBeTruthy();

    // a simulated group accepts (what the hub would relay)
    const { estado, despachar } = useAyudante.getState();
    const oferta = estado.pedidos[0]!.ofertas[0]!;
    despachar({ tipo: 'responder', ofertaId: oferta.id, grupoId: oferta.grupoAyudaId, acepta: true });
    await userEvent.type(await screen.findByLabelText('¿Lo puedes decir con tus palabras?'), 'Si el hilo es más largo el péndulo tarda más');
    await userEvent.click(screen.getByRole('button', { name: 'Nos ayudó' }));
    const nudo = useAyudante.getState().estado.nudos[0]!;
    expect(nudo).toMatchObject({ grupoPideId: GRUPO_DEMO.id, estado: 'por_confirmar' });
    expect(registroMuseo.eventos.map((e) => e.tipo)).toContain('ayuda.cerrada');
  });

  it('the F4 rules judge needs a real phrase about the concept', () => {
    expect(juzgarFrase('sí')).toBe('no_evaluable');
    expect(juzgarFrase('nos explicaron bien')).toBe('no_evaluable');
    expect(juzgarFrase('la cuerda cambia algo')).toBe('explorado');
    expect(juzgarFrase('si la cuerda es más larga tarda más en volver')).toBe('razonado');
  });
});

describe('Tablero de ayudas (teacher side)', () => {
  it('turns the Ayudante on, takes an escalated request, confirms and revokes a knot', async () => {
    render(<RouterProvider router={createMemoryRouter([{ path: '/', element: <TableroAyudas /> }])} />);
    const interruptor = screen.getByRole('checkbox', { name: /Ayudante del museo apagado/ });
    await userEvent.click(interruptor);
    expect(useAyudante.getState().estado.config.activo).toBe(true);

    const { despachar } = useAyudante.getState();
    despachar({ tipo: 'pedir', grupoPideId: GRUPO_DEMO.id, exhibicionId: 'exh-pendulo', nodoId: 'longitud-periodo', necesidad: 'revisar_dato' });
    const oferta = useAyudante.getState().estado.pedidos[0]!.ofertas[0]!;
    despachar({ tipo: 'responder', ofertaId: oferta.id, grupoId: oferta.grupoAyudaId, acepta: true });
    despachar({ tipo: 'cerrar', pedidoId: oferta.pedidoId, grupoId: GRUPO_DEMO.id, resultado: 'nos_ayudo', frase: 'la cuerda larga tarda más tiempo en oscilar', nivelJuez: 'razonado' });

    await userEvent.click(await screen.findByRole('button', { name: 'Confirmar nudo' }));
    expect(useAyudante.getState().estado.nudos[0]!.estado).toBe('confirmado');
    await userEvent.click(screen.getByRole('button', { name: 'Revocar' }));
    expect(useAyudante.getState().estado.nudos[0]!.estado).toBe('revocado');
    expect(registroMuseo.eventos.map((e) => e.tipo)).toEqual(expect.arrayContaining(['quipu.nudo.confirmado', 'quipu.nudo.revocado']));
  });
});
