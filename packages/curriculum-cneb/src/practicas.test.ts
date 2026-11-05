import { readdirSync, readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { Practica } from '@rikuy/contracts';
import { citaLiteral } from './cita.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const carpeta = join(aqui, '..', '..', '..', 'content', 'practicas');
const archivos = readdirSync(carpeta).filter((f) => f.endsWith('.json')).sort();

function cargar(archivo: string): unknown {
  return JSON.parse(readFileSync(join(carpeta, archivo), 'utf8')) as unknown;
}

describe('content/practicas', () => {
  it('contains the three practices converted from the legacy code', () => {
    expect(archivos).toEqual(['lactasa.json', 'pendulo.json', 'respiratorio.json']);
  });

  it.each(archivos)('%s passes Practica.safeParse', (archivo) => {
    const resultado = Practica.safeParse(cargar(archivo));
    expect(resultado.success, resultado.success ? '' : JSON.stringify(resultado.error.issues)).toBe(true);
  });

  it.each(archivos)('%s quotes a CNEB performance literally (citaLiteral)', (archivo) => {
    const practica = Practica.parse(cargar(archivo));
    expect(citaLiteral(practica.desempeno)).toBe(true);
  });

  it('gives every practice a distinct id', () => {
    const ids = archivos.map((a) => Practica.parse(cargar(a)).id);
    expect(new Set(ids).size).toBe(archivos.length);
  });

  it('keeps the legacy guiding questions and hint ladders', () => {
    const pendulo = Practica.parse(cargar('pendulo.json'));
    expect(pendulo.preguntaGuia).toBe('Si alargas la cuerda, ¿el péndulo irá más rápido o más lento?');
    expect(pendulo.pistas).toHaveLength(3);
  });
});

describe('bundled practices (@rikuy/curriculum-cneb)', () => {
  it('exposes the same three practices as content/practicas, valid and by slug or id', async () => {
    const { PRACTICAS, practicaPorClave, slugDePractica, textosParaEstudiantes } = await import('./practicas.ts');
    expect(Object.keys(PRACTICAS).sort()).toEqual(archivos.map((a) => a.replace('.json', '')).sort());
    const p = PRACTICAS.pendulo!;
    expect(practicaPorClave(p.id)).toBe(p);
    expect(slugDePractica(p.id)).toBe('pendulo');
    expect(textosParaEstudiantes(p)?.preguntaGuia).toBe(p.preguntaGuia);
  });
});
