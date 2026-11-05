import { describe, expect, it } from 'vitest';
import {
  type ContextoAyudante,
  type EstadoAyudante,
  type EstadoNodo,
  GUIA_AYUDANTE,
  NECESIDADES,
  aplicar,
  estadoInicialAyudante,
  tableroAyudas,
} from './ayudante.ts';

const A = '01JC0000000000000000000G01';
const B = '01JC0000000000000000000G02';
const C = '01JC0000000000000000000G03';
const D = '01JC0000000000000000000G04';
const NODO = 'longitud-periodo';
const MIN = 60_000;

function ctx(over: Partial<ContextoAyudante> = {}): ContextoAyudante {
  const razonados = new Set([B, C, D]);
  let n = 0;
  return {
    ahora: 0,
    azar: () => 0,
    gruposClase: [A, B, C, D],
    estadoNodo: (g: string): EstadoNodo => (razonados.has(g) ? 'razonado' : 'explorado'),
    nuevoId: () => `id${++n}`,
    ...over,
  };
}

const activo = (): EstadoAyudante => aplicar(estadoInicialAyudante(), { tipo: 'configurar', activo: true }, ctx()).estado;

function pedir(e: EstadoAyudante, c = ctx(), grupo = A) {
  return aplicar(e, { tipo: 'pedir', grupoPideId: grupo, exhibicionId: 'exh-pendulo', nodoId: NODO, necesidad: 'otras_palabras' }, c);
}

describe('Ayudante del museo: teacher switch', () => {
  it('is off by default and refuses requests until the teacher turns it on', () => {
    const e = estadoInicialAyudante();
    expect(e.config.activo).toBe(false);
    expect(pedir(e).error).toBe('apagado');
  });
});

describe('request: fixed chips, same class, random eligible helpers', () => {
  it('offers to 2 random groups whose Cerebro node is "razonado", never the requester', () => {
    const r = pedir(activo(), ctx({ azar: () => 0.99 }));
    expect(r.error).toBeUndefined();
    const pedido = r.estado.pedidos[0]!;
    expect(pedido.estado).toBe('ofrecido');
    expect(pedido.ofertas).toHaveLength(2);
    for (const o of pedido.ofertas) expect([B, C, D]).toContain(o.grupoAyudaId);
    expect(r.eventos.map((e) => e.tipo)).toEqual(['ayuda.pedida', 'ayuda.ofrecida', 'ayuda.ofrecida']);
  });

  it('only accepts the fixed needs (no free text)', () => {
    expect(Object.keys(NECESIDADES)).toEqual(['otras_palabras', 'como_medir', 'revisar_dato']);
    const r = aplicar(activo(), { tipo: 'pedir', grupoPideId: A, exhibicionId: 'x', nodoId: NODO, necesidad: 'explicame todo' as never }, ctx());
    expect(r.error).toBe('necesidad_invalida');
  });

  it('rejects groups from another class', () => {
    expect(pedir(activo(), ctx(), '01JC0000000000000000000G99').error).toBe('otra_clase');
  });

  it('goes to the teacher when nobody is eligible', () => {
    const r = pedir(activo(), ctx({ estadoNodo: () => 'explorado' }));
    expect(r.estado.pedidos[0]!.estado).toBe('escalado');
  });

  it('a group cannot open two requests at once', () => {
    const e = pedir(activo()).estado;
    expect(pedir(e).error).toBe('pedido_abierto');
  });

  it('a group gets at most 2 offers per hour and 1 active help at a time', () => {
    let e = activo();
    const solo = ctx({ gruposClase: [A, B, C, D], estadoNodo: (g) => (g === B ? 'razonado' : 'explorado') });
    // C asks, B gets the offer and accepts: B is busy
    e = pedir(e, solo, C).estado;
    const oferta = e.pedidos[0]!.ofertas[0]!;
    e = aplicar(e, { tipo: 'responder', ofertaId: oferta.id, grupoId: B, acepta: true }, solo).estado;
    expect(pedir(e, solo, A).estado.pedidos.at(-1)!.estado).toBe('escalado');
  });
});

describe('help in person with the 3-step guide', () => {
  it('ships the three steps of the helper guide', () => {
    expect(GUIA_AYUDANTE).toHaveLength(3);
    expect(GUIA_AYUDANTE[2]).toMatch(/con sus palabras/);
  });

  it('accepting expires the other offers and starts the help', () => {
    let e = pedir(activo()).estado;
    const [o1] = e.pedidos[0]!.ofertas;
    const r = aplicar(e, { tipo: 'responder', ofertaId: o1!.id, grupoId: o1!.grupoAyudaId, acepta: true }, ctx());
    e = r.estado;
    expect(e.pedidos[0]!.estado).toBe('en_curso');
    expect(e.pedidos[0]!.grupoAyudaId).toBe(o1!.grupoAyudaId);
    expect(e.pedidos[0]!.ofertas.map((o) => o.estado)).toEqual(['aceptada', 'vencida']);
    expect(r.eventos.map((x) => x.tipo)).toEqual(['ayuda.aceptada']);
  });

  it('only the invited group can answer an offer', () => {
    const e = pedir(activo()).estado;
    const o = e.pedidos[0]!.ofertas[0]!;
    expect(aplicar(e, { tipo: 'responder', ofertaId: o.id, grupoId: A, acepta: true }, ctx()).error).toBe('no_invitado');
  });

  it('escalates to the teacher after 3 minutes without an answer', () => {
    const e = pedir(activo()).estado;
    const r = aplicar(e, { tipo: 'tick' }, ctx({ ahora: 3 * MIN + 1 }));
    expect(r.estado.pedidos[0]!.estado).toBe('escalado');
    expect(r.estado.pedidos[0]!.ofertas.every((o) => o.estado === 'vencida')).toBe(true);
  });
});

function ayudaEnCurso(c = ctx()) {
  let e = pedir(activo(), c).estado;
  const o = e.pedidos.at(-1)!.ofertas[0]!;
  e = aplicar(e, { tipo: 'responder', ofertaId: o.id, grupoId: o.grupoAyudaId, acepta: true }, c).estado;
  return { e, pedido: e.pedidos.at(-1)!, ayudante: o.grupoAyudaId };
}

describe('closing: "con tus palabras" and the double-confirmed knot', () => {
  it('the requester closes with its own phrase; the knot waits for the teacher, then is confirmed', () => {
    const { e, pedido, ayudante } = ayudaEnCurso();
    const r = aplicar(
      e,
      { tipo: 'cerrar', pedidoId: pedido.id, grupoId: A, resultado: 'nos_ayudo', frase: 'Si el hilo es más largo tarda más en ir y volver', nivelJuez: 'razonado' },
      ctx(),
    );
    const nudo = r.estado.nudos[0]!;
    expect(nudo).toMatchObject({ grupoAyudaId: ayudante, grupoPideId: A, estado: 'por_confirmar' });
    expect(r.eventos.map((x) => x.tipo)).toEqual(['ayuda.cerrada']);
    const conf = aplicar(r.estado, { tipo: 'confirmar', nudoId: nudo.id }, ctx());
    expect(conf.estado.nudos[0]!.estado).toBe('confirmado');
    const ev = conf.eventos[0]!;
    expect(ev.tipo).toBe('quipu.nudo.confirmado');
    expect(ev.datos).toMatchObject({ motivo: 'ayudo_a_otro_grupo', beneficiarios: [{ tipo: 'grupo', grupoId: ayudante }, { tipo: 'aula' }] });
  });

  it('only the requesting group can close, and "aún no" gives no knot', () => {
    const { e, pedido, ayudante } = ayudaEnCurso();
    expect(aplicar(e, { tipo: 'cerrar', pedidoId: pedido.id, grupoId: ayudante, resultado: 'nos_ayudo' }, ctx()).error).toBe('solo_quien_pide');
    expect(aplicar(e, { tipo: 'cerrar', pedidoId: pedido.id, grupoId: A, resultado: 'aun_no' }, ctx()).estado.nudos).toEqual([]);
  });

  it('a knot needs the restated phrase; "no evaluable" can only be confirmed by the teacher', () => {
    const { e, pedido } = ayudaEnCurso();
    expect(aplicar(e, { tipo: 'cerrar', pedidoId: pedido.id, grupoId: A, resultado: 'nos_ayudo' }, ctx()).estado.nudos).toEqual([]);
    const sinRegla = { ...e, config: { ...e.config, docenteConfirma: false } };
    const ok = aplicar(sinRegla, { tipo: 'cerrar', pedidoId: pedido.id, grupoId: A, resultado: 'nos_ayudo', frase: 'algo', nivelJuez: 'razonado' }, ctx());
    expect(ok.estado.nudos[0]!.estado).toBe('confirmado');
    const noEval = aplicar(sinRegla, { tipo: 'cerrar', pedidoId: pedido.id, grupoId: A, resultado: 'nos_ayudo', frase: 'algo', nivelJuez: 'no_evaluable' }, ctx());
    expect(noEval.estado.nudos[0]!.estado).toBe('por_confirmar');
  });

  it('caps help knots at 3 per helper per day and 1 per pair and concept per week', () => {
    const c = ctx({ gruposClase: [A, B, C, D], estadoNodo: (g) => (g === B ? 'razonado' : 'explorado') });
    let e = { ...activo(), config: { activo: true, docenteConfirma: false } };
    const ronda = (pide: string, t: number) => {
      const ct = { ...c, ahora: t };
      e = pedir(e, ct, pide).estado;
      const p = e.pedidos.at(-1)!;
      e = aplicar(e, { tipo: 'responder', ofertaId: p.ofertas[0]!.id, grupoId: B, acepta: true }, ct).estado;
      e = aplicar(e, { tipo: 'cerrar', pedidoId: p.id, grupoId: pide, resultado: 'nos_ayudo', frase: 'f', nivelJuez: 'razonado' }, ct).estado;
    };
    ronda(A, 0);
    ronda(A, 70 * MIN); // same pair and concept within the week: no new knot
    expect(e.nudos).toHaveLength(1);
    ronda(C, 140 * MIN);
    ronda(D, 210 * MIN);
    expect(e.nudos).toHaveLength(3);
    // a fourth group the same day would exceed 3 per day
    const E = '01JC0000000000000000000G05';
    const c5 = { ...c, gruposClase: [A, B, C, D, E] };
    const ct = { ...c5, ahora: 280 * MIN };
    e = pedir(e, ct, E).estado;
    const p = e.pedidos.at(-1)!;
    e = aplicar(e, { tipo: 'responder', ofertaId: p.ofertas[0]!.id, grupoId: B, acepta: true }, ct).estado;
    e = aplicar(e, { tipo: 'cerrar', pedidoId: p.id, grupoId: E, resultado: 'nos_ayudo', frase: 'f', nivelJuez: 'razonado' }, ct).estado;
    expect(e.nudos).toHaveLength(3);
  });

  it('the teacher can revoke a knot (a correction, not a deletion)', () => {
    const { e, pedido } = ayudaEnCurso();
    const cerrado = aplicar(e, { tipo: 'cerrar', pedidoId: pedido.id, grupoId: A, resultado: 'nos_ayudo', frase: 'f', nivelJuez: 'razonado' }, ctx()).estado;
    const conf = aplicar(cerrado, { tipo: 'confirmar', nudoId: cerrado.nudos[0]!.id }, ctx()).estado;
    const r = aplicar(conf, { tipo: 'revocar', nudoId: conf.nudos[0]!.id }, ctx());
    expect(r.estado.nudos).toHaveLength(1);
    expect(r.estado.nudos[0]!.estado).toBe('revocado');
    expect(r.eventos[0]!.tipo).toBe('quipu.nudo.revocado');
  });
});

describe('teacher controls and board', () => {
  it('a silenced group cannot ask nor be offered; the teacher can take a request herself', () => {
    let e = aplicar(activo(), { tipo: 'silenciar', grupoId: B, silenciado: true }, ctx()).estado;
    e = pedir(e, ctx({ azar: () => 0 })).estado;
    expect(e.pedidos[0]!.ofertas.map((o) => o.grupoAyudaId)).not.toContain(B);
    expect(pedir(e, ctx(), B).error).toBe('silenciado');
    const r = aplicar(e, { tipo: 'yo_ayudo', pedidoId: e.pedidos[0]!.id }, ctx());
    expect(r.estado.pedidos[0]).toMatchObject({ estado: 'en_curso', ayudaDocente: true });
  });

  it('summarises help flows for the teacher without any ranking', () => {
    const { e, pedido } = ayudaEnCurso();
    const t = tableroAyudas(aplicar(e, { tipo: 'cerrar', pedidoId: pedido.id, grupoId: A, resultado: 'nos_ayudo', frase: 'f', nivelJuez: 'razonado' }, ctx()).estado);
    expect(t.cerrados).toHaveLength(1);
    expect(t.porConfirmar).toHaveLength(1);
    expect(t.abiertos).toEqual([]);
    expect(t.conceptos).toEqual([{ nodoId: NODO, pedidos: 1 }]);
    expect(JSON.stringify(t)).not.toMatch(/ranking|puntaje/);
  });
});
