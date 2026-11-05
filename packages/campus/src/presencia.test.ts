import type { MensajeRtCliente, MensajeRtHub } from '@rikuy/contracts';
import { MensajeRtCliente as EsquemaCliente } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { ClientePresencia } from './presencia.ts';
import type { PuertoPresencia } from './puertos.ts';

const G = '01JC0000000000000000000G01';
const G2 = '01JC0000000000000000000G02';

function puertoFalso() {
  const enviados: MensajeRtCliente[] = [];
  let oyente: (m: MensajeRtHub) => void = () => {};
  let ahora = 0;
  const puerto: PuertoPresencia = {
    enviar: (m) => enviados.push(m),
    suscribir: (cb) => {
      oyente = cb;
      return () => {};
    },
  };
  return {
    puerto,
    enviados,
    reloj: () => ahora,
    hub: (m: MensajeRtHub, t = ahora) => {
      ahora = t;
      oyente(m);
    },
  };
}

describe('presence client (3.9)', () => {
  it('sends valid rt messages: room, movement capped at the configured rate and only when moving', () => {
    const { puerto, enviados } = puertoFalso();
    const c = new ClientePresencia(puerto, { hz: 6 });
    c.entrarSala('sala-fisica', 0);
    c.actualizar(0, [{ x: 1.5, y: 2.5, dir: 2 }]);
    c.actualizar(50, [{ x: 1.6, y: 2.5, dir: 0 }]); // too soon (6 Hz = 166 ms)
    c.actualizar(200, [{ x: 1.7, y: 2.5, dir: 0 }]);
    c.actualizar(400, [{ x: 1.7, y: 2.5, dir: 0 }]); // no movement: nothing
    expect(enviados.map((m) => m.t)).toEqual(['rt.sala', 'rt.mov', 'rt.mov']);
    expect(enviados[1]).toEqual({ t: 'rt.mov', s: 0, sala: 'sala-fisica', p: [[15, 25, 2]] });
    expect(enviados[2]).toMatchObject({ s: 1, p: [[17, 25, 0]] });
    for (const m of enviados) expect(EsquemaCliente.safeParse(m).success).toBe(true);
  });

  it('clamps the rate between 4 and 8 Hz', () => {
    expect(new ClientePresencia(puertoFalso().puerto, { hz: 30 }).hz).toBe(8);
    expect(new ClientePresencia(puertoFalso().puerto, { hz: 1 }).hz).toBe(4);
  });

  it('sends a heartbeat after 2 s without movement', () => {
    const { puerto, enviados } = puertoFalso();
    const c = new ClientePresencia(puerto);
    c.entrarSala('vestibulo', 0);
    c.actualizar(0, [{ x: 1, y: 1, dir: 0 }]);
    c.actualizar(1000, [{ x: 1, y: 1, dir: 0 }]);
    c.actualizar(2100, [{ x: 1, y: 1, dir: 0 }]);
    expect(enviados.at(-1)).toEqual({ t: 'rt.latido' });
  });

  it('only sends reactions from the closed list (no chat)', () => {
    const { puerto, enviados } = puertoFalso();
    const c = new ClientePresencia(puerto);
    c.reaccionar('saludar');
    expect(enviados).toEqual([{ t: 'rt.gesto', g: 'saludar' }]);
    expect(() => c.reaccionar('hola a todos' as never)).toThrow();
  });

  it('tracks peers from snapshots and deltas, interpolating 100 ms behind', () => {
    const { puerto, hub, reloj } = puertoFalso();
    const c = new ClientePresencia(puerto, { reloj });
    c.entrarSala('sala-fisica', 0);
    hub({ t: 'rt.instantanea', sala: 'sala-fisica', pares: [{ d: 'GRUPO00002', g: G2, p: [[10, 10, 0]] }] }, 0);
    hub({ t: 'rt.delta', sala: 'sala-fisica', s: 1, cambios: [{ d: 'GRUPO00002', p: [[20, 10, 0]] }] }, 200);
    const [par] = c.pares(200); // 100 ms behind -> halfway between samples at 0 and 200
    expect(par!.d).toBe('GRUPO00002');
    expect(par!.p[0]!.x).toBeCloseTo(1.5);
    // extrapolation is capped at 250 ms past the last sample
    const lejos = c.pares(5000)[0]!.p[0]!.x;
    expect(lejos).toBeCloseTo(2 + 5 * 0.25); // 5 tiles/s for at most 250 ms
  });

  it('removes peers that leave or stay silent for 8 s, and ignores other rooms', () => {
    const { puerto, hub, reloj } = puertoFalso();
    const c = new ClientePresencia(puerto, { reloj });
    c.entrarSala('sala-fisica', 0);
    hub({ t: 'rt.instantanea', sala: 'sala-fisica', pares: [{ d: 'GRUPO00002', g: G2, p: [[10, 10, 0]] }, { d: 'GRUPO00003', g: G, p: [[30, 10, 0]] }] }, 0);
    hub({ t: 'rt.delta', sala: 'otra', s: 1, cambios: [{ d: 'GRUPO00009', p: [[1, 1, 0]] }] }, 10);
    hub({ t: 'rt.delta', sala: 'sala-fisica', s: 2, cambios: [{ d: 'GRUPO00003', fuera: true }] }, 100);
    expect(c.pares(100).map((p) => p.d)).toEqual(['GRUPO00002']);
    expect(c.pares(8200)).toEqual([]);
  });

  it('keeps the room occupancy from the welcome message', () => {
    const { puerto, hub, reloj } = puertoFalso();
    const c = new ClientePresencia(puerto, { reloj });
    hub({ t: 'rt.bienvenida', yo: 'GRUPO00001', salas: { 'sala-fisica': 3, vestibulo: 1 }, hora: 0 }, 0);
    expect(c.ocupacion('sala-fisica')).toBe(3);
    expect(c.ocupacion('patio')).toBe(0);
  });
});
