import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { corregirEnsayo, validarEnsayo, type Ensayo, type ClavesEnsayo } from './ensayo.ts';
import { desempenoTexto } from './cita.ts';

const aqui = dirname(fileURLToPath(import.meta.url));
const raiz = join(aqui, '..', '..', '..');
const ensayoPath = join(raiz, 'content', 'practicas', 'ensayos', 'pendulo.json');
const clavesPath = join(raiz, 'content', 'claves', 'ensayos', 'pendulo.json');

const ensayo = JSON.parse(readFileSync(ensayoPath, 'utf8')) as Ensayo;
const claves = JSON.parse(readFileSync(clavesPath, 'utf8')) as ClavesEnsayo;

describe('pendulum rehearsal quiz (student copy)', () => {
  it('has 3 to 5 items with 2 to 4 options each', () => {
    expect(validarEnsayo(ensayo)).toEqual([]);
    expect(ensayo.preguntas.length).toBeGreaterThanOrEqual(3);
    expect(ensayo.preguntas.length).toBeLessThanOrEqual(5);
  });

  it('points every item at an existing science and technology performance', () => {
    for (const pregunta of ensayo.preguntas) {
      const { competencia, desempeno } = pregunta.desempeno;
      expect(desempenoTexto('secundaria', 1, competencia, desempeno), `C${competencia} D${desempeno}`).toBeDefined();
    }
  });

  it('carries no answer key and no feedback', () => {
    const texto = readFileSync(ensayoPath, 'utf8');
    expect(texto).not.toMatch(/correcta|retro/i);
  });

  it('is linked to the pendulum practice id', () => {
    expect(ensayo.practicaId).toBe('TKTQRM5ZA5335H979P5CPAJZ95');
  });
});

describe('pendulum rehearsal quiz (keys, kept out of the student package)', () => {
  it('matches the quiz id and has one key and one feedback text per item', () => {
    expect(claves.recursoId).toBe(ensayo.id);
    expect(claves.correctas).toHaveLength(ensayo.preguntas.length);
    expect(claves.retro).toHaveLength(ensayo.preguntas.length);
  });

  it('points each key at an existing option', () => {
    ensayo.preguntas.forEach((p, i) => {
      expect(claves.correctas[i], `pregunta ${i + 1}`).toBeGreaterThanOrEqual(0);
      expect(claves.correctas[i], `pregunta ${i + 1}`).toBeLessThan(p.opciones.length);
    });
  });

  it('lives under content/claves, never under content/practicas (what the packager ships)', () => {
    expect(existsSync(clavesPath)).toBe(true);
    const enPracticas = listarJson(join(raiz, 'content', 'practicas'));
    for (const archivo of enPracticas) {
      expect(readFileSync(archivo, 'utf8'), archivo).not.toMatch(/"correctas"/);
    }
  });
});

describe('corregirEnsayo (run by the hub or the teacher device, never by the student device)', () => {
  it('counts every correct answer and returns nothing to review', () => {
    const respuestas = claves.correctas;
    expect(corregirEnsayo(ensayo, claves, respuestas)).toEqual({ aciertos: ensayo.preguntas.length, total: ensayo.preguntas.length, porRevisar: [] });
  });

  it('lists the performances of the missed items', () => {
    const respuestas = claves.correctas.map((c, i) => (i === 1 ? (c + 1) % ensayo.preguntas[1]!.opciones.length : c));
    const resultado = corregirEnsayo(ensayo, claves, respuestas);
    expect(resultado.aciertos).toBe(ensayo.preguntas.length - 1);
    expect(resultado.porRevisar).toEqual([ensayo.preguntas[1]!.desempeno]);
  });
});

function listarJson(dir: string): string[] {
  return readdirSync(dir).flatMap((nombre) => {
    const ruta = join(dir, nombre);
    if (statSync(ruta).isDirectory()) return listarJson(ruta);
    return nombre.endsWith('.json') ? [ruta] : [];
  });
}
