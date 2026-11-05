import { describe, expect, it } from 'vitest';
import { crearFuenteAyudas, type RegistroAyuda } from './tablero.ts';

const G = { puma: '01JC0000000000000000000G03', condor: '01JC0000000000000000000G01', vizcacha: '01JC0000000000000000000G02' };
const pedido = (n: number, grupoPide: string, extra: Partial<RegistroAyuda> = {}): RegistroAyuda => ({
  pedido: { id: `P${n}`, grupoPideId: grupoPide, exhibicionId: 'exh-pendulo', pasoId: 'medir', nodoId: 'longitud-periodo', necesidad: 'como_medir', estado: 'abierto', ts: 1000 + n },
  ofertas: [],
  ...extra,
});

describe('help board (T-23)', () => {
  it('starts with the Ayudante off, as the spec requires', () => {
    expect(crearFuenteAyudas([]).estado().activo).toBe(false);
  });

  it('groups requests as open, in progress and closed, in the order they arrived', () => {
    const f = crearFuenteAyudas([
      pedido(3, G.puma),
      pedido(1, G.condor, { pedido: { ...pedido(1, G.condor).pedido, estado: 'en_curso' }, ofertas: [{ id: 'O1', pedidoId: 'P1', grupoAyudaId: G.vizcacha, estado: 'aceptada' }] }),
      pedido(2, G.vizcacha, { pedido: { ...pedido(2, G.vizcacha).pedido, estado: 'cerrado' }, cierre: { pedidoId: 'P2', resultado: 'nos_ayudo', ts: 3000 }, ofertas: [{ id: 'O2', pedidoId: 'P2', grupoAyudaId: G.condor, estado: 'aceptada' }], nudo: 'por_confirmar' }),
    ]);
    const t = f.tablero();
    expect(t.abiertos.map((x) => x.pedido.id)).toEqual(['P3']);
    expect(t.enCurso.map((x) => x.pedido.id)).toEqual(['P1']);
    expect(t.cerrados.map((x) => x.pedido.id)).toEqual(['P2']);
  });

  it('never orders by how many helps a group gave (no ranking)', () => {
    const regs = [1, 2, 3, 4].map((n) => pedido(n, G.puma, { pedido: { ...pedido(n, G.puma).pedido, estado: 'cerrado' }, ofertas: [{ id: `O${n}`, pedidoId: `P${n}`, grupoAyudaId: n === 4 ? G.condor : G.vizcacha, estado: 'aceptada' }], nudo: 'por_confirmar' as const }));
    expect(crearFuenteAyudas(regs).tablero().cerrados.map((x) => x.pedido.id)).toEqual(['P1', 'P2', 'P3', 'P4']);
    expect(Object.keys(crearFuenteAyudas(regs).tablero())).toEqual(['abiertos', 'enCurso', 'cerrados', 'nudosPorConfirmar']);
  });

  it('lists the knots waiting for the teacher and lets her confirm or revoke them as a correction, not a deletion', () => {
    const f = crearFuenteAyudas([pedido(1, G.puma, { pedido: { ...pedido(1, G.puma).pedido, estado: 'cerrado' }, cierre: { pedidoId: 'P1', resultado: 'nos_ayudo', ts: 5 }, ofertas: [{ id: 'O1', pedidoId: 'P1', grupoAyudaId: G.condor, estado: 'aceptada' }], nudo: 'por_confirmar' })]);
    expect(f.tablero().nudosPorConfirmar).toBe(1);
    f.confirmarNudo('P1');
    expect(f.tablero().nudosPorConfirmar).toBe(0);
    expect(f.registro('P1')?.nudo).toBe('confirmado');
    f.revocarNudo('P1');
    expect(f.registro('P1')?.nudo).toBe('revocado');
    expect(f.registro('P1')?.pedido.id).toBe('P1'); // still in the ledger
  });

  it('"yo ayudo" takes an open request over and closes the loop with the teacher', () => {
    const f = crearFuenteAyudas([pedido(1, G.puma)]);
    f.yoAyudo('P1');
    expect(f.registro('P1')?.pedido.estado).toBe('escalado');
    expect(f.tablero().abiertos).toHaveLength(0);
  });

  it('switching the Ayudante off or muting a group is recorded and reversible', () => {
    const f = crearFuenteAyudas([]);
    f.activar(true);
    f.silenciar(G.puma, true);
    expect(f.estado()).toEqual({ activo: true, silenciados: [G.puma] });
    f.silenciar(G.puma, false);
    f.activar(false);
    expect(f.estado()).toEqual({ activo: false, silenciados: [] });
  });

  it('notifies subscribers on every change', () => {
    const f = crearFuenteAyudas([pedido(1, G.puma)]);
    let n = 0;
    const baja = f.suscribir(() => void (n += 1));
    f.yoAyudo('P1');
    f.activar(true);
    baja();
    f.activar(false);
    expect(n).toBe(2);
  });
});
