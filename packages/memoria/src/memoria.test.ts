import { MemoriaEntrada, type Evidencia, type EventoTipado } from '@rikuy/contracts';
import { dispositivos, ids } from '@rikuy/contracts/fixtures';
import { describe, expect, it } from 'vitest';
import { criptoWebCrypto, type AlmacenClaves } from './boveda.ts';
import { MemoriaLocal } from './memoria.ts';
import { proyectarMemoria, type ContextoProyeccion } from './proyeccion.ts';

let n = 0;
const hlc = (ms: number) => `${String(1762300800000 + ms).padStart(13, '0')}-0000-grupo001`;
const ulid = (k: string) => `01JC${k.toUpperCase().replace(/[ILOU]/g, 'X').padEnd(22, '0').slice(0, 22)}`;

function ev(tipo: string, datos: unknown, ms: number, estudianteIds?: string[]): EventoTipado {
  n++;
  return {
    id: ulid(`EV${n}`), dispositivo: dispositivos.grupo1, seq: n, hlc: hlc(ms), claseId: ids.clase, sv: 1, tipo,
    autor: { grupoId: ids.grupo1, ...(estudianteIds ? { estudianteIds } : {}) }, datos,
  } as unknown as EventoTipado;
}

const evidencia = (id: string, respuestaId: string, indicador: Evidencia['indicador'], nivel: Evidencia['nivel'], desempeno = 1): Evidencia => ({
  id, respuestaId, grupoId: ids.grupo1, claseId: ids.clase, indicador, nivel, estado: 'ok', cita: 'frase', desempeno: { competencia: 1, desempeno }, fuente: 'reglas', confirmadaPorDocente: false,
});
const respuesta = (id: string) => ({ id, claseId: ids.clase, grupoId: ids.grupo1, momento: 'prediccion', texto: 'tarda más', lengua: 'es', entrada: 'teclado', pistasUsadasAntes: 0 });

const E1 = ids.estudiante1;
const E2 = ids.estudiante2;

const ctx: ContextoProyeccion = {
  aulaId: ids.aula,
  practicaDeClase: () => ({ desempeno: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1 }, conceptos: ['longitud', 'periodo'] }),
  contraste: () => 'confirma',
};

describe('projection (3.10): deterministic entries from events', () => {
  it('a prediction at level >= 2 confirmed by the own data -> prediccion_confirmada', () => {
    const eventos = [ev('respuesta.registrada', respuesta(ulid('R1')), 1, [E1]), ev('evidencia.calculada', evidencia(ulid('V1'), ulid('R1'), 'prediccion', 2), 2)];
    const out = proyectarMemoria(eventos, ctx);
    expect(out).toHaveLength(1);
    expect(out[0]).toMatchObject({ estudianteId: E1, tipo: 'prediccion_confirmada', aulaId: ids.aula, conceptos: ['longitud', 'periodo'] });
    expect(MemoriaEntrada.safeParse(out[0]).success).toBe(true);
    expect(out[0]!.evidenciaIds).toEqual([ulid('V1')]);
  });
  it('a prediction the data contradict -> prediccion_refutada (material for the tutor, not a negative label)', () => {
    const eventos = [ev('respuesta.registrada', respuesta(ulid('R1')), 1, [E1]), ev('evidencia.calculada', evidencia(ulid('V1'), ulid('R1'), 'prediccion', 2), 2)];
    const out = proyectarMemoria(eventos, { ...ctx, contraste: () => 'contradice' });
    expect(out[0]!.tipo).toBe('prediccion_refutada');
    expect(out[0]!.resumen).not.toMatch(/mal|error|fall|incorrect/i);
  });
  it('without a way to compare with the data it claims neither', () => {
    const eventos = [ev('respuesta.registrada', respuesta(ulid('R1')), 1, [E1]), ev('evidencia.calculada', evidencia(ulid('V1'), ulid('R1'), 'prediccion', 3), 2)];
    expect(proyectarMemoria(eventos, { ...ctx, contraste: undefined })).toEqual([]);
    expect(proyectarMemoria(eventos, { ...ctx, contraste: () => 'indeterminado' })).toEqual([]);
  });
  it('pista 3 in a performance -> pista_necesaria for the attributed students', () => {
    const eventos = [ev('pista.mostrada', { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 3 }, 1, [E1, E2]), ev('pista.mostrada', { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 1 }, 2, [E1])];
    const out = proyectarMemoria(eventos, ctx);
    expect(out.map((e) => [e.estudianteId, e.tipo]).sort()).toEqual([[E1, 'pista_necesaria'], [E2, 'pista_necesaria']].sort());
  });
  it('teacher-confirmed level 3 -> logro; a correction down removes it', () => {
    const base = [ev('respuesta.registrada', respuesta(ulid('R1')), 1, [E1]), ev('evidencia.calculada', evidencia(ulid('V1'), ulid('R1'), 'justificacion', 2), 2)];
    const up = proyectarMemoria([...base, ev('evidencia.confirmada', { evidenciaId: ulid('V1'), nivel: 3 }, 3)], ctx);
    expect(up.map((e) => e.tipo)).toContain('logro');
    const confirmedAt3 = proyectarMemoria([...base.slice(0, 1), ev('evidencia.calculada', evidencia(ulid('V1'), ulid('R1'), 'justificacion', 3), 2), ev('evidencia.confirmada', { evidenciaId: ulid('V1') }, 3)], ctx);
    expect(confirmedAt3.map((e) => e.tipo)).toContain('logro');
    const down = proyectarMemoria([...base.slice(0, 1), ev('evidencia.calculada', evidencia(ulid('V1'), ulid('R1'), 'justificacion', 3), 2), ev('evidencia.confirmada', { evidenciaId: ulid('V1'), nivel: 1 }, 3)], ctx);
    expect(down.map((e) => e.tipo)).not.toContain('logro');
    expect(proyectarMemoria(base, ctx).map((e) => e.tipo)).not.toContain('logro'); // not confirmed
  });
  it('two or more evidences at level <= 1 in the same performance -> dificultad ("NO" never counts)', () => {
    const eventos = [
      ev('respuesta.registrada', respuesta(ulid('R1')), 1, [E1]), ev('respuesta.registrada', respuesta(ulid('R2')), 2, [E1]), ev('respuesta.registrada', respuesta(ulid('R3')), 3, [E1]),
      ev('evidencia.calculada', evidencia(ulid('V1'), ulid('R1'), 'variable', 1), 4),
      ev('evidencia.calculada', evidencia(ulid('V2'), ulid('R2'), 'justificacion', 0), 5),
      ev('evidencia.calculada', evidencia(ulid('V3'), ulid('R3'), 'prediccion', 'NO'), 6),
    ];
    const out = proyectarMemoria(eventos, { ...ctx, contraste: undefined });
    expect(out.filter((e) => e.tipo === 'dificultad')).toHaveLength(1);
    expect(out[0]!.evidenciaIds.sort()).toEqual([ulid('V1'), ulid('V2')].sort());
    expect(proyectarMemoria(eventos.slice(0, 5), { ...ctx, contraste: undefined }).filter((e) => e.tipo === 'dificultad')).toHaveLength(1);
    expect(proyectarMemoria([...eventos.slice(0, 2), eventos[3]!, eventos[5]!], { ...ctx, contraste: undefined })).toEqual([]);
  });
  it('without avatars the answer belongs to the group and individual memory ignores it', () => {
    const eventos = [ev('respuesta.registrada', respuesta(ulid('R1')), 1), ev('evidencia.calculada', evidencia(ulid('V1'), ulid('R1'), 'prediccion', 3), 2)];
    expect(proyectarMemoria(eventos, ctx)).toEqual([]);
  });
  it('is deterministic: same events in any order give the same entries and ids', () => {
    const eventos = [ev('respuesta.registrada', respuesta(ulid('R1')), 1, [E1]), ev('evidencia.calculada', evidencia(ulid('V1'), ulid('R1'), 'prediccion', 2), 2), ev('pista.mostrada', { grupoId: ids.grupo1, practicaId: ids.practica, nivel: 3 }, 3, [E1])];
    const a = proyectarMemoria(eventos, ctx);
    const b = proyectarMemoria([...eventos].reverse(), ctx);
    expect(b).toEqual(a);
    expect(new Set(a.map((e) => e.id)).size).toBe(a.length);
  });
  it('the summary is a template: never the student free text', () => {
    const eventos = [ev('respuesta.registrada', { ...respuesta(ulid('R1')), texto: 'SECRETO-DEL-ALUMNO' }, 1, [E1]), ev('evidencia.calculada', { ...evidencia(ulid('V1'), ulid('R1'), 'prediccion', 2), cita: 'SECRETO-DEL-ALUMNO' }, 2)];
    for (const e of proyectarMemoria(eventos, ctx)) {
      expect(e.resumen).not.toContain('SECRETO');
      expect(e.resumen.length).toBeLessThanOrEqual(200);
    }
  });
  it('estudiante.olvidar removes everything of that student from the projection', () => {
    const eventos = [
      ev('respuesta.registrada', respuesta(ulid('R1')), 1, [E1, E2]), ev('evidencia.calculada', evidencia(ulid('V1'), ulid('R1'), 'prediccion', 2), 2),
      ev('estudiante.olvidar', { estudianteId: E1 }, 3),
    ];
    const out = proyectarMemoria(eventos, ctx);
    expect(out.map((e) => e.estudianteId)).toEqual([E2]);
  });
});

describe('MemoriaLocal: retrieval through ConsultaMemoria', () => {
  const entrada = (k: string, estudianteId: string, tipo: MemoriaEntrada['tipo'], resumen: string, ms: number, conceptos: string[], desempeno = 1, competencia = 1): MemoriaEntrada => ({
    id: ulid(k), estudianteId, aulaId: ids.aula, competencia: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia, desempeno }, conceptos, tipo, resumen, evidenciaIds: [], hlc: hlc(ms),
  });
  const todas = [
    entrada('A1', E1, 'prediccion_refutada', 'Predijo que la masa cambiaba el periodo y su dato lo contradijo', 1, ['masa', 'periodo']),
    entrada('A2', E1, 'logro', 'La docente confirmó un logro sobre la longitud de la cuerda', 5, ['longitud']),
    entrada('A3', E1, 'pista_necesaria', 'Necesitó la pista 3 con la temperatura de la enzima', 3, ['temperatura', 'lactasa'], 2, 2),
    entrada('B1', E2, 'dificultad', 'Mostró nivel bajo en la gravedad', 2, ['gravedad']),
  ];
  const memoria = () => {
    const m = new MemoriaLocal({ vecinos: (c) => (c === 'longitud' ? ['periodo'] : []) });
    m.cargar(todas);
    return m;
  };

  it('filters by student, orders by recency and caps the default at 5', async () => {
    const r = await memoria().recuperar({ estudianteId: E1 });
    expect(r.map((e) => e.id)).toEqual([ulid('A2'), ulid('A3'), ulid('A1')]);
    expect((await memoria().recuperar({})).length).toBeLessThanOrEqual(5);
  });
  it('filters by competency and performance of the current practice', async () => {
    expect((await memoria().recuperar({ estudianteId: E1, competencia: 2 })).map((e) => e.id)).toEqual([ulid('A3')]);
    expect((await memoria().recuperar({ estudianteId: E1, competencia: 1, desempeno: 1 })).map((e) => e.id)).toEqual([ulid('A2'), ulid('A1')]);
  });
  it('ranks by concept, expanding one hop in the concept graph', async () => {
    const r = await memoria().recuperar({ estudianteId: E1, conceptos: ['longitud'] });
    expect(r[0]!.id).toBe(ulid('A2')); // direct hit
    expect(r[1]!.id).toBe(ulid('A1')); // 'periodo' is one hop away
  });
  it('can query by group through its members', async () => {
    const m = new MemoriaLocal({ integrantes: (g) => (g === ids.grupo1 ? [E2] : []) });
    m.cargar(todas);
    expect((await m.recuperar({ grupoId: ids.grupo1 })).map((e) => e.estudianteId)).toEqual([E2]);
  });
  it('respects the limit', async () => {
    expect(await memoria().recuperar({ estudianteId: E1, limite: 1 })).toHaveLength(1);
  });
  it('keyword search (MiniSearch): accent-free, whole words, prefix', () => {
    const m = memoria();
    expect(m.buscar('masa').map((e) => e.id)).toEqual([ulid('A1')]);
    expect(m.buscar('CONFIRMO logró'.replace('logró', 'logro')).map((e) => e.id)).toContain(ulid('A2'));
    expect(m.buscar('gravedad')[0]!.id).toBe(ulid('B1'));
    expect(m.buscar('lact')[0]!.id).toBe(ulid('A3')); // prefix on a concept
    expect(m.buscar('estudiante inexistente zzz')).toEqual([]);
  });
  it('keyword search honors the student and competency filters', () => {
    const m = memoria();
    expect(m.buscar('pista', { estudianteId: E2 })).toEqual([]);
    expect(m.buscar('pista', { estudianteId: E1, competencia: 2 }).map((e) => e.id)).toEqual([ulid('A3')]);
  });
  it('tutor view: at most 5 entries and about 600 characters', () => {
    const muchas = Array.from({ length: 9 }, (_, i) => entrada(`C${i}`, E1, 'logro', 'x'.repeat(150), 10 + i, ['longitud']));
    const m = new MemoriaLocal();
    m.cargar(muchas);
    const v = m.paraTutor(muchas);
    expect(v.entradas.length).toBeLessThanOrEqual(5);
    expect(v.texto.length).toBeLessThanOrEqual(600);
  });
  it('the teacher can delete one entry and it stays deleted after a rebuild', () => {
    const m = memoria();
    m.borrarEntrada(ulid('A1'));
    expect(m.buscar('masa')).toEqual([]);
    m.cargar(todas);
    expect(m.buscar('masa')).toEqual([]);
  });
});

describe('forgetting (gate): after estudiante.olvidar nothing of that student is recoverable', () => {
  const E = (k: string, estudianteId: string, resumen: string): MemoriaEntrada => ({
    id: ulid(k), estudianteId, aulaId: ids.aula, competencia: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1 }, conceptos: ['longitud'], tipo: 'logro', resumen, evidenciaIds: [], hlc: hlc(1),
  });
  it('recuperar, buscar and paraTutor return nothing, and a rebuild does not bring it back', async () => {
    const m = new MemoriaLocal();
    m.cargar([E('F1', E1, 'logro de Uno sobre la cuerda'), E('F2', E2, 'logro de Dos sobre la cuerda')]);
    await m.olvidar(E1);
    expect(await m.recuperar({ estudianteId: E1 })).toEqual([]);
    expect(m.buscar('cuerda').map((e) => e.estudianteId)).toEqual([E2]);
    expect(m.paraTutor(await m.recuperar({})).entradas.every((e) => e.estudianteId !== E1)).toBe(true);
    m.cargar([E('F1', E1, 'logro de Uno sobre la cuerda'), E('F2', E2, 'logro de Dos sobre la cuerda')]);
    expect(await m.recuperar({ estudianteId: E1 })).toEqual([]);
  });
  it('the per-student key is destroyed: the encrypted sentences become unreadable', async () => {
    const claves = new Map<string, Uint8Array>();
    const almacen: AlmacenClaves = {
      async leer(id) { return claves.get(id); },
      async guardar(id, k) { claves.set(id, k); },
      async borrar(id) { claves.delete(id); },
    };
    const cripto = criptoWebCrypto(almacen);
    const m = new MemoriaLocal({ cripto });
    const c1 = await cripto.cifrar(E1, 'la cuerda larga tarda más');
    const c2 = await cripto.cifrar(E2, 'la masa no cambia nada');
    expect(c1.datos).not.toContain('cuerda');
    expect(await cripto.descifrar(E1, c1)).toBe('la cuerda larga tarda más');
    await m.olvidar(E1);
    expect(await cripto.descifrar(E1, c1)).toBeUndefined();
    expect(await cripto.descifrar(E2, c2)).toBe('la masa no cambia nada');
    expect(claves.has(E1)).toBe(false);
  });
  it('a key is never used for another student', async () => {
    const claves = new Map<string, Uint8Array>();
    const cripto = criptoWebCrypto({ async leer(id) { return claves.get(id); }, async guardar(id, k) { claves.set(id, k); }, async borrar(id) { claves.delete(id); } });
    const c = await cripto.cifrar(E1, 'hola');
    expect(await cripto.descifrar(E2, c)).toBeUndefined();
  });
});
