import { DatosRetoProgreso } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { RETOS, RepositorioProgresoMemoria, iniciar, interpretarNumero, responder } from './index.ts';

const G = '01JC0000000000000000000G01';
const feria = RETOS.find((r) => r.id === 'feria')!;

describe('contextual challenges catalog', () => {
  it('ships the feria, chacra and llamas challenges with local context', () => {
    expect(RETOS.map((r) => r.id)).toEqual(['feria', 'chacra', 'llamas']);
    for (const r of RETOS) {
      expect(r.contexto.length).toBeGreaterThan(20);
      expect(r.pasos.length).toBeGreaterThanOrEqual(2);
      for (const p of r.pasos) {
        expect(p.pista).toBeTruthy();
        expect(p.retro).toMatch(/\?/); // Rikuy answers a wrong choice with a question
      }
    }
  });

  it('never carries scores, rankings or speed', () => {
    expect(JSON.stringify(RETOS)).not.toMatch(/puntaje|puntos|ranking|segundos|velocidad/i);
  });
});

describe('challenge engine (per group, no per-person scores)', () => {
  it('reads numbers the Peruvian way', () => {
    expect(interpretarNumero('6')).toBe(6);
    expect(interpretarNumero(' 2,5 ')).toBe(2.5);
    expect(interpretarNumero('1.000')).toBe(1000);
    expect(interpretarNumero('abc')).toBeNull();
  });

  it('advances on a right answer and emits a contract-valid reto.progreso', () => {
    const p0 = iniciar(feria, G);
    const r = responder(feria, p0, '6');
    expect(r.correcto).toBe(true);
    expect(r.progreso).toEqual({ retoId: 'feria', grupoId: G, paso: 1, completado: false });
    expect(DatosRetoProgreso.safeParse(r.evento).success).toBe(true);
  });

  it('answers a wrong try with a question and offers the hint after two tries, without advancing', () => {
    const p0 = iniciar(feria, G);
    const r1 = responder(feria, p0, '9');
    expect(r1.correcto).toBe(false);
    expect(r1.mensaje).toMatch(/\?/);
    expect(r1.progreso.paso).toBe(0);
    expect(r1.evento).toBeUndefined();
    const r2 = responder(feria, r1.progreso, '10', r1.intentos);
    expect(r2.mostrarPista).toBe(true);
  });

  it('completes the challenge after the last step', () => {
    let p = iniciar(feria, G);
    for (const paso of feria.pasos) {
      const respuesta = paso.tipo === 'numero' ? String(paso.valor) : String(paso.correcta);
      p = responder(feria, p, respuesta).progreso;
    }
    expect(p.completado).toBe(true);
    expect(responder(feria, p, '1').correcto).toBe(false);
  });

  it('accepts numbers within the tolerance and option indexes for choice steps', () => {
    const chacra = RETOS.find((r) => r.id === 'chacra')!;
    const paso = chacra.pasos[0]!;
    if (paso.tipo !== 'numero') throw new Error('expected a number step');
    expect(responder(chacra, iniciar(chacra, G), String(paso.valor)).correcto).toBe(true);
    expect(responder(chacra, iniciar(chacra, G), String(paso.valor + 1)).correcto).toBe(false);
  });

  it('stores progress per group in the repository port', async () => {
    const repo = new RepositorioProgresoMemoria();
    expect(await repo.obtener('feria', G)).toBeNull();
    await repo.guardar({ retoId: 'feria', grupoId: G, paso: 1, completado: false });
    expect(await repo.obtener('feria', G)).toEqual({ retoId: 'feria', grupoId: G, paso: 1, completado: false });
  });
});
