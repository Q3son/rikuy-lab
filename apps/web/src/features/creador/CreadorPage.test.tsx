import { SolicitudPractica, ejecutarCadena, aprobarPropuesta, crearAdaptadoresSimulados, crearCatalogoCneb, crearCatalogoPracticas, crearEnrutador, Presupuesto, RegistroUsoMemoria, type PropuestaCreador } from '@rikuy/ai';
import { Practica } from '@rikuy/contracts';
import { ejemplos } from '@rikuy/contracts/fixtures';
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { CreadorPage } from './CreadorPage.tsx';
import type { ClienteNube } from './clienteNube.ts';
import { reducir, estadoInicial } from './estado.ts';

// The page talks to the gateway through a client; here the client runs the real chain over the mock adapters (no network).
function clienteSimulado(sobrescribir: Partial<ClienteNube> = {}, tope = 10): ClienteNube {
  const registro = new RegistroUsoMemoria();
  const presupuesto = new Presupuesto({ registro, topeMensualUsd: tope });
  const catalogo = crearCatalogoCneb();
  const politica = { orden: ['gemini', 'meta'] as ('gemini' | 'meta')[], timeoutMs: 1000, privacidad: 'solo-docente' as const };
  const enrutador = crearEnrutador({
    adaptadores: crearAdaptadoresSimulados(),
    politicas: { generarPractica: politica, revisarPractica: politica, pictogramas: politica, visionTabla: politica, traducir: politica, extraerPlan: politica },
    presupuesto,
    registro,
  });
  let n = 0;
  const deps = { enrutador, catalogo, practicas: crearCatalogoPracticas([Practica.parse(ejemplos.practica)]), nuevoId: () => `01JC0000000000000000000N${String(++n).padStart(2, '0')}` };
  return {
    estado: async () => ({ modo: 'simulado', restanteUsd: 3 }),
    desempenos: async () => catalogo.listar!(),
    generar: (s) => ejecutarCadena(deps, { colegioId: 'demo' }, SolicitudPractica.parse(s)),
    aprobar: async (p, docente) => {
      const r = await aprobarPropuesta(deps, p as PropuestaCreador, { docente });
      return r.ok ? { ok: true, ...r.valor } : { ok: false, hallazgos: r.error };
    },
    publicar: vi.fn(async (paquete) => ({ id: (paquete.cuerpo as { id: string }).id, version: 1 })),
    ...sobrescribir,
  };
}

afterEach(cleanup);

describe('state machine', () => {
  it('moves from start to published and can restart', () => {
    let e = reducir(estadoInicial, { tipo: 'generar' });
    expect(e.fase).toBe('generando');
    e = reducir(e, { tipo: 'catalogo', catalogo: [], aviso: 'x' });
    expect(e).toMatchObject({ fase: 'inicio', aviso: 'x' });
    expect(reducir(e, { tipo: 'reiniciar' })).toEqual(estadoInicial);
  });
});

describe('Creador page (mock mode, no network)', () => {
  it('shows the mock banner and the performance picker', async () => {
    render(<CreadorPage cliente={clienteSimulado()} />);
    expect(await screen.findByText(/datos simulados/i)).toBeTruthy();
    await waitFor(() => expect(screen.getByRole('combobox', { name: /desempeño/i }).querySelectorAll('option').length).toBeGreaterThan(0));
  });

  it('runs generate -> edit -> approve and sign -> publish', async () => {
    const cliente = clienteSimulado();
    render(<CreadorPage cliente={cliente} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /generar borrador/i })).toHaveProperty('disabled', false));
    fireEvent.click(screen.getByRole('button', { name: /generar borrador/i }));

    expect(await screen.findByRole('heading', { name: /borrador de la práctica/i })).toBeTruthy();
    expect(screen.getByText(/verificador: aprobado/i)).toBeTruthy();
    expect(screen.getByText(/revisión de muse: ok/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /aprobar y firmar/i }));
    expect(await screen.findByText(/práctica aprobada y firmada/i)).toBeTruthy();

    fireEvent.click(screen.getByRole('button', { name: /publicar/i }));
    expect(await screen.findByText(/publicada en la nube/i)).toBeTruthy();
    expect(cliente.publicar).toHaveBeenCalledTimes(1);
    const [paquete, clave] = (cliente.publicar as unknown as { mock: { calls: [{ firma?: string }, string][] } }).mock.calls[0]!;
    expect(paquete.firma).toBeTruthy();
    expect(clave.length).toBeGreaterThan(20);
  });

  it('blocks approval when the teacher edit puts the result in a hint', async () => {
    render(<CreadorPage cliente={clienteSimulado()} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /generar borrador/i })).toHaveProperty('disabled', false));
    fireEvent.click(screen.getByRole('button', { name: /generar borrador/i }));
    await screen.findByRole('heading', { name: /borrador de la práctica/i });
    fireEvent.change(screen.getByLabelText(/pista 3/i), { target: { value: 'Debe salir 1,9 s con la cuerda de 0,9 m.' } });
    fireEvent.click(screen.getByRole('button', { name: /aprobar y firmar/i }));
    const alerta = await screen.findByRole('alert');
    expect(within(alerta).getByText(/pista 3/i)).toBeTruthy();
    expect(screen.queryByText(/práctica aprobada y firmada/i)).toBeNull();
  });

  it('offers the catalog when the quota is exhausted', async () => {
    render(<CreadorPage cliente={clienteSimulado({}, 0)} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /generar borrador/i })).toHaveProperty('disabled', false));
    fireEvent.click(screen.getByRole('button', { name: /generar borrador/i }));
    expect(await screen.findByText(/cupo de ia/i)).toBeTruthy();
    expect(screen.getByRole('list', { name: /catálogo/i }).querySelectorAll('li').length).toBeGreaterThan(0);
  });

  it('keeps working offline: the network error offers the catalog', async () => {
    const cliente = clienteSimulado({ generar: async () => { throw new Error('No hay conexión con la nube de Rikuy. Puedes usar una práctica del catálogo.'); } });
    render(<CreadorPage cliente={cliente} />);
    await waitFor(() => expect(screen.getByRole('button', { name: /generar borrador/i })).toHaveProperty('disabled', false));
    fireEvent.click(screen.getByRole('button', { name: /generar borrador/i }));
    expect(await screen.findByText(/no hay conexión/i)).toBeTruthy();
  });
});
