import { ClientePresencia } from '@rikuy/campus';
import { MensajeRtHub } from '@rikuy/contracts';
import { afterEach, describe, expect, it } from 'vitest';
import { construirMuseo } from '../catalogo.ts';
import { HubSimulado } from './hubSimulado.ts';

const museo = construirMuseo();
const escenas = (sala: string) => (sala === 'vestibulo' ? museo.vestibulo : museo.salas[sala]);
let hub: HubSimulado | null = null;
afterEach(() => hub?.detener());

describe('simulated hub (mock of the F8 realtime port)', () => {
  it('answers a room change with contract-valid welcome and snapshot, then 8 Hz deltas', () => {
    hub = new HubSimulado(escenas, () => 5);
    const recibidos: unknown[] = [];
    hub.suscribir((m) => recibidos.push(m));
    hub.enviar({ t: 'rt.sala', sala: 'sala-fisica' });
    hub.tick();
    hub.tick();
    expect(recibidos.length).toBeGreaterThanOrEqual(3);
    for (const m of recibidos) expect(MensajeRtHub.safeParse(m).success).toBe(true);
  });

  it('feeds the presence client with peers that stay on walkable tiles', () => {
    hub = new HubSimulado(escenas, () => 40);
    let ahora = 0;
    const cliente = new ClientePresencia(hub, { reloj: () => ahora });
    cliente.entrarSala('vestibulo', 0);
    for (let i = 0; i < 40; i++) {
      ahora += 125;
      hub.tick();
    }
    const pares = cliente.pares(ahora);
    expect(pares).toHaveLength(40);
    for (const par of pares) {
      const { x, y } = par.p[0]!;
      expect(museo.vestibulo.grilla.bloqueada[Math.floor(y) * museo.vestibulo.mapa.ancho + Math.floor(x)]).toBe(0);
    }
    expect(hub.grupos.size).toBe(40);
  });
});
