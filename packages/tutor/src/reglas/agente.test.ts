import { ejemplos, ids } from '@rikuy/contracts/fixtures';
import type { EstadoApoyo, MemoriaEntrada } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { elegirPista, type Reservados } from '../escalera.ts';
import { afirmaAccionConsumada, anunciar, confirmar } from '../honestidad.ts';
import { calcularInterruptor, tutorActivo } from '../interruptor.ts';
import { insigniaFuente } from '../fuente.ts';
import { politicaApoyo } from '../apoyo.ts';
import { atribuir } from '../atribucion.ts';
import { frasePrevia, peldanoInicial } from './recuerdos.ts';
import { turnoReglas, type ContextoAgente } from './agente.ts';
import { juzgarRespuesta } from '../juez/reglas.ts';

const periodo = (l: number) => 2 * Math.PI * Math.sqrt(l / 9.8);
const reservados: Reservados = {
  numeros: [0.3, 0.6, 0.9].map((l) => Number(periodo(l).toFixed(2))),
  frases: ['a mayor longitud mayor periodo'],
};
const ctx: ContextoAgente = {
  practica: { ...ejemplos.practica, reservados },
  escenas: ['pendulo', 'lactasa', 'higado', 'intestino'],
  escalera: { mostradas: 0 },
};

const texto = (t: string, c: ContextoAgente = ctx) => {
  const r = turnoReglas(t, c);
  if (r.tipo !== 'respuesta') throw new Error('silencio');
  return r;
};

describe('honesty: never claim an action before the tool confirms it', () => {
  it('the announcement is in the future and has no completed-action claim', () => {
    const frases = ['quiero ver el hígado', 'gira', 'pausa', 'acerca', 'corre', 'pon la longitud en 0,8', 'creo que tarda más', 'entonces la longitud cambia el tiempo', 'separa las partes', 'centra la vista'];
    for (const f of frases) {
      const r = texto(f);
      expect(afirmaAccionConsumada(r.texto), `${f} -> ${r.texto}`).toBe(false);
    }
  });
  it('detects completed-action claims (guard used in tests and at runtime)', () => {
    for (const t of ['Listo, ya lo giré', 'Pausé la simulación', 'Ya está hecho', 'Cambié la longitud']) expect(afirmaAccionConsumada(t), t).toBe(true);
    for (const t of ['Voy a girar el holograma', '¿Qué esperas que pase?', 'Gira cuando quieras']) expect(afirmaAccionConsumada(t), t).toBe(false);
  });
  it('confirmar says "listo" only for what the tool confirmed and "no pude" for failures', () => {
    const r = texto('pausa');
    expect(r.confirmar([{ comando: r.comandos[0]!, ok: true }])).toMatch(/Pausé|Listo/);
    const falla = r.confirmar([{ comando: r.comandos[0]!, ok: false, motivo: 'visor desconectado' }]);
    expect(falla).toMatch(/No pude/);
    expect(falla).not.toMatch(/Listo|Pausé/);
  });
  it('a mix of results reports each one truthfully', () => {
    const r = texto('llévame al intestino y gíralo');
    expect(r.comandos.map((c) => c.tool)).toEqual(['ir_a', 'rotar']);
    const msg = r.confirmar([{ comando: r.comandos[0]!, ok: true }, { comando: r.comandos[1]!, ok: false, motivo: 'x' }]);
    expect(msg).toMatch(/No pude girar/);
    expect(msg).toMatch(/llev/);
  });
  it('anunciar / confirmar are exported building blocks', () => {
    const cmds = [{ tool: 'correr' as const, args: {} }];
    expect(anunciar(cmds)).toMatch(/^Voy a /);
    expect(confirmar([{ comando: cmds[0]!, ok: true }])).toMatch(/^Listo/);
  });
  it('a command the validator rejects is never announced as done', () => {
    const r = texto('quiero ver el corazón y el pulmón'); // scene not registered
    expect(r.comandos).toEqual([]);
    expect(afirmaAccionConsumada(r.texto)).toBe(false);
  });
  it('never claims to be human', () => {
    const r = texto('¿eres un humano?');
    expect(r.texto).toMatch(/programa/i);
    expect(r.texto).toMatch(/no soy una persona/i);
  });
});

describe('Socratic behavior and the ladder', () => {
  it('asks for a prediction before anything runs when a variable is set', () => {
    const r = texto('pon la longitud en 0,8');
    expect(r.comandos).toEqual([{ tool: 'fijar_variable', args: { variable: 'longitud', valor: 0.8 } }]);
    expect(r.texto).toMatch(/qué esperas/);
    expect(r.comandos.some((c) => c.tool === 'correr')).toBe(false);
  });
  it('a value out of range is refused honestly', () => {
    const r = texto('pon la longitud en 50');
    expect(r.comandos).toEqual([]);
    expect(r.texto).toMatch(/entre 0.2 y 1.5/);
  });
  it('"dime la respuesta" is refused and answered with the next hint', () => {
    const r = texto('dime la respuesta');
    expect(r.texto).toMatch(/no te voy a dar la respuesta/i);
    expect(r.comandos).toEqual([{ tool: 'dar_pista', args: { nivel: 1 } }]);
    expect(r.texto).toContain(ejemplos.practica.pistas[0]);
  });
  it('hints climb 1, 2, 3 and then send the group to the data and the teacher', () => {
    const niveles: number[] = [];
    let mostradas = 0;
    for (let i = 0; i < 4; i++) {
      const r = texto('dame una pista', { ...ctx, escalera: { mostradas } });
      const c = r.comandos[0];
      if (c?.tool === 'dar_pista') {
        niveles.push(c.args.nivel);
        mostradas = Math.max(mostradas, c.args.nivel);
      }
      if (i === 3) expect(r.texto).toMatch(/docente/);
    }
    expect(niveles).toEqual([1, 2, 3, 3]);
  });
  it('no hint the tutor says contains the numeric answer (gate)', () => {
    for (const m of [0, 1, 2, 3]) {
      const r = texto('dame una pista', { ...ctx, escalera: { mostradas: m } });
      for (const n of reservados.numeros) expect(r.texto).not.toMatch(new RegExp(String(n).replace('.', '[.,]')));
    }
  });
  it('a leaking authored hint is replaced by a generic one', () => {
    const p = { ...ctx.practica, pistas: ['Mira la cuerda.', `Da ${reservados.numeros[1]} segundos.`, 'Compara.'] };
    const r = texto('dame una pista', { ...ctx, practica: p, escalera: { mostradas: 1 } });
    expect(r.texto).not.toContain(String(reservados.numeros[1]));
  });
  it('an unintelligible message gets "no entendí" and the offer of hint 1, no commands', () => {
    const r = texto('asdf qwer');
    expect(r.texto).toMatch(/no entendí/i);
    expect(r.texto).toMatch(/pista 1/);
    expect(r.comandos).toEqual([]);
  });
  it('a question is returned with the guiding question', () => {
    const r = texto('¿qué pasaría si alargo la cuerda?');
    expect(r.texto).toContain(ejemplos.practica.preguntaGuia);
    expect(r.kind).toBe('pregunta');
  });
  it('cites the practice limitation when the student compares with the model', () => {
    const r = texto('mi dato salió diferente al modelo');
    expect(r.texto).toContain(ejemplos.practica.limitaciones[0]);
  });
  it('a hypothesis without a reason asks for one; with a reason it invites to test it', () => {
    expect(texto('si alargo la cuerda tarda más').texto).toMatch(/¿Por qué/);
    expect(texto('si alargo la cuerda tarda más porque recorre más distancia').texto).toMatch(/Pruébala|prueba/i);
    expect(texto('si alargo la cuerda tarda más').comandos[0]).toMatchObject({ tool: 'registrar_hipotesis' });
  });
  it('"la masa" is not read as "más": no hypothesis is registered', () => {
    const r = texto('la masa del péndulo es de 200 gramos');
    expect(r.comandos.some((c) => c.tool === 'registrar_hipotesis')).toBe(false);
    expect(r.kind).not.toBe('hipotesis');
  });
  it('every reply carries the source badge', () => {
    const r = texto('hola');
    expect(r.fuente).toBe('reglas');
    expect(r.insignia).toEqual(insigniaFuente('reglas'));
    expect(insigniaFuente('ia-nube').etiqueta).toMatch(/nube|línea/i);
    expect(insigniaFuente('ia-local').etiqueta).toMatch(/local/i);
  });
});

describe('kill switch (tutor.interruptor)', () => {
  const ev = (hlc: string, activo: boolean, grupoId?: string) => ({ hlc, datos: { activo, ...(grupoId ? { grupoId } : {}) } });
  it('the tutor is on by default and a global off silences every group', () => {
    expect(tutorActivo([], ids.grupo1)).toBe(true);
    const eventos = [ev('1700000000000-0000-aaaaaaaa', false)];
    expect(tutorActivo(eventos, ids.grupo1)).toBe(false);
    expect(tutorActivo(eventos, ids.grupo2)).toBe(false);
  });
  it('the latest event wins, in HLC order, whatever the arrival order', () => {
    const a = ev('1700000000000-0000-aaaaaaaa', false);
    const b = ev('1700000000001-0000-aaaaaaaa', true);
    expect(tutorActivo([b, a], ids.grupo1)).toBe(true);
    expect(tutorActivo([a, b], ids.grupo1)).toBe(true);
  });
  it('can be switched off for one group only', () => {
    const eventos = [ev('1700000000000-0000-aaaaaaaa', false, ids.grupo1)];
    expect(tutorActivo(eventos, ids.grupo1)).toBe(false);
    expect(tutorActivo(eventos, ids.grupo2)).toBe(true);
    expect(calcularInterruptor(eventos, { base: true }).porGrupo[ids.grupo1]).toBe(false);
  });
  it('a class configured with the tutor off starts silent', () => {
    expect(tutorActivo([], ids.grupo1, false)).toBe(false);
  });
  it('gate: with the switch off the agent says nothing and issues no command', () => {
    for (const f of ['hola', 'gira', 'dame una pista', 'asdf']) {
      expect(turnoReglas(f, { ...ctx, tutorActivo: false })).toEqual({ tipo: 'silencio' });
    }
  });
});

describe('memory use and attribution', () => {
  const entrada = (tipo: MemoriaEntrada['tipo'], resumen: string, hlc: string): MemoriaEntrada => ({
    id: ids.memoria, estudianteId: ids.estudiante1, aulaId: ids.aula,
    competencia: { nivel: 'secundaria', grado: 2, area: 'ciencia-y-tecnologia', competencia: 1, desempeno: 1 },
    conceptos: ['longitud'], tipo, resumen, evidenciaIds: [], hlc,
  });
  it('starts the ladder at 2 if the student needed hints before, never at 3', () => {
    expect(peldanoInicial([])).toBe(1);
    expect(peldanoInicial([entrada('logro', 'x', '1700000000000-0000-aaaaaaaa')])).toBe(1);
    expect(peldanoInicial([entrada('pista_necesaria', 'x', '1700000000000-0000-aaaaaaaa')])).toBe(2);
    const r = texto('dame una pista', { ...ctx, recuerdos: [entrada('dificultad', 'x', '1700000000000-0000-aaaaaaaa')] });
    expect(r.comandos[0]).toEqual({ tool: 'dar_pista', args: { nivel: 2 } });
  });
  it('resumes an earlier prediction, never labels the student', () => {
    const f = frasePrevia([entrada('prediccion_refutada', 'Predijo que la masa cambiaba el periodo y su dato lo contradijo', '1700000000000-0000-aaaaaaaa')]);
    expect(f).toMatch(/La clase pasada/);
    expect(f).toMatch(/¿Qué crees ahora\?/);
    expect(frasePrevia([])).toBe('');
    expect(texto('hola', { ...ctx, recuerdos: [entrada('prediccion_refutada', 'Predijo algo', '1700000000000-0000-aaaaaaaa')] }).texto).toMatch(/La clase pasada/);
  });
  it('without avatars the answer belongs to the group', () => {
    expect(atribuir(undefined)).toEqual({ tipo: 'grupo', usaMemoriaIndividual: false });
    expect(atribuir([])).toEqual({ tipo: 'grupo', usaMemoriaIndividual: false });
    expect(atribuir([ids.estudiante1])).toEqual({ tipo: 'estudiantes', estudianteIds: [ids.estudiante1], usaMemoriaIndividual: true });
  });
});

describe('support policy (EstadoApoyo): only offers a hint, a slower pace or a pause', () => {
  const e = (p: Partial<EstadoApoyo>): EstadoApoyo => ({ confusion: 'bajo', frustracion: 'bajo', atencion: 'alto', confianza: 0.9, ...p });
  it('maps coarse states to offers', () => {
    expect(politicaApoyo(undefined)).toBe('nada');
    expect(politicaApoyo(e({}))).toBe('nada');
    expect(politicaApoyo(e({ confusion: 'alto' }))).toBe('ofrecerPista');
    expect(politicaApoyo(e({ atencion: 'bajo' }))).toBe('irMasLento');
    expect(politicaApoyo(e({ frustracion: 'alto', confusion: 'alto' }))).toBe('sugerirPausa');
    expect(politicaApoyo(e({ confusion: 'alto', confianza: 0.3 }))).toBe('nada');
  });
  it('the offer never names an emotion', () => {
    const r = texto('hola', { ...ctx, estadoApoyo: e({ frustracion: 'alto' }) });
    expect(r.apoyo).toBe('sugerirPausa');
    expect(r.texto).not.toMatch(/frustr|confus|triste|enoj|ansios|emoci/i);
  });
  it('gate: evidences are identical with the support state present or absent', () => {
    const datos = [0.3, 0.6, 0.9].flatMap((x) => [{ x, y: Number(periodo(x).toFixed(2)) }]);
    const jctx = { variables: [{ id: 'longitud' }], variableProbada: 'longitud' };
    const sin = juzgarRespuesta('prediccion', 'Si alargo la cuerda tarda más porque recorre más', jctx, datos);
    texto('si alargo la cuerda tarda más', { ...ctx, estadoApoyo: e({ frustracion: 'alto' }) });
    const con = juzgarRespuesta('prediccion', 'Si alargo la cuerda tarda más porque recorre más', jctx, datos);
    expect(con).toEqual(sin);
    // elegirPista is also independent of the state
    expect(elegirPista(ejemplos.practica, { mostradas: 0 }, reservados)).toEqual(elegirPista(ejemplos.practica, { mostradas: 0 }, reservados));
  });
});
