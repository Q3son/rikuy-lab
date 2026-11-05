import { ejemplos } from '@rikuy/contracts/fixtures';
import fc from 'fast-check';
import { describe, expect, it } from 'vitest';
import { elegirPista, MAX_PELDANOS, nivelPermitido, pistaNoRevela, type Reservados } from './escalera.ts';
import { extraerNumeros } from './texto.ts';

const practica = ejemplos.practica;
const periodo = (l: number) => 2 * Math.PI * Math.sqrt(l / 9.8);
const reservados: Reservados = {
  numeros: [0.3, 0.6, 0.9].map((l) => Number(periodo(l).toFixed(2))),
  frases: ['a mayor longitud mayor periodo'],
  limitacionesInvertidas: ['el modelo no tiene rozamiento y por eso es perfecto'],
};

describe('hint ladder (1 general .. 3 concrete)', () => {
  it('starts at 1, goes up one rung at a time and caps at 3', () => {
    expect(MAX_PELDANOS).toBe(3);
    expect(elegirPista(practica, { mostradas: 0 }, reservados)).toMatchObject({ nivel: 1, texto: practica.pistas[0] });
    expect(elegirPista(practica, { mostradas: 1 }, reservados)).toMatchObject({ nivel: 2, texto: practica.pistas[1] });
    expect(elegirPista(practica, { mostradas: 2 }, reservados)).toMatchObject({ nivel: 3, texto: practica.pistas[2], agotada: false });
    expect(elegirPista(practica, { mostradas: 3 }, reservados)).toMatchObject({ nivel: 3, agotada: true });
  });

  it('never skips a rung', () => {
    expect(nivelPermitido(1, { mostradas: 0 })).toBe(true);
    expect(nivelPermitido(3, { mostradas: 0 })).toBe(false);
    expect(nivelPermitido(3, { mostradas: 1 })).toBe(false);
    expect(nivelPermitido(3, { mostradas: 2 })).toBe(true);
    expect(nivelPermitido(1, { mostradas: 3 })).toBe(true); // repeating an earlier hint is fine
    expect(nivelPermitido(4, { mostradas: 3 })).toBe(false); // the ladder has 3 rungs
    expect(nivelPermitido(0, { mostradas: 0 })).toBe(false);
  });

  it('a previous difficulty in memory can start the ladder at rung 2 (never at 3)', () => {
    expect(elegirPista(practica, { mostradas: 0, inicial: 2 }, reservados).nivel).toBe(2);
    expect(nivelPermitido(2, { mostradas: 0, inicial: 2 })).toBe(true);
    expect(nivelPermitido(3, { mostradas: 0, inicial: 2 })).toBe(false);
  });

  it('a practice with only two hints has a two-rung ladder', () => {
    const corta = { ...practica, pistas: ['Primera.', 'Segunda.'] };
    expect(elegirPista(corta, { mostradas: 2 }, reservados)).toMatchObject({ nivel: 2, agotada: true });
  });
});

describe('pistaNoRevela', () => {
  it('rejects the numeric result of the model, in any common spelling', () => {
    const r = reservados.numeros[1]!; // 1.55
    for (const t of [`Debería dar ${r}`, `Da ${String(r).replace('.', ',')} segundos`, 'Da casi 1.5 s']) {
      expect(pistaNoRevela(t, reservados).ok, t).toBe(false);
    }
  });
  it('rejects spelled-out numbers when the answer is that number', () => {
    expect(pistaNoRevela('El periodo se duplica: es el doble', { numeros: [2], frases: [] }).ok).toBe(false);
    expect(pistaNoRevela('Mide la mitad', { numeros: [0.5], frases: [] }).ok).toBe(false);
    expect(pistaNoRevela('Son cuatro oscilaciones', { numeros: [4], frases: [] }).ok).toBe(false);
  });
  it('rejects the expected conclusion, even reworded a little', () => {
    expect(pistaNoRevela('Fíjate: a mayor longitud, mayor periodo', reservados).ok).toBe(false);
    expect(pistaNoRevela('Mayor longitud implica mayor periodo', reservados).ok).toBe(false);
  });
  it('rejects the inverted limitation', () => {
    expect(pistaNoRevela('Recuerda que el modelo no tiene rozamiento y por eso es perfecto', reservados).ok).toBe(false);
  });
  it('accepts a guiding question and numbers that are inputs, not results', () => {
    expect(pistaNoRevela('Compara el tiempo de 10 vueltas con cada largo.', reservados).ok).toBe(true);
    expect(pistaNoRevela('¿Qué podrías cambiar del péndulo?', reservados).ok).toBe(true);
  });
});

describe('gate: no hint contains the numeric answer', () => {
  it('every hint the ladder serves is free of the reserved numbers (property)', () => {
    fc.assert(
      fc.property(
        fc.double({ min: 0.2, max: 500, noNaN: true }).map((x) => Number(x.toFixed(2))),
        fc.integer({ min: 0, max: 2 }),
        fc.constantFrom('Debería dar {n}', 'Fíjate en {n}', 'El valor ronda {n} en total', 'Anota {n}'),
        (n, donde, plantilla) => {
          const texto = plantilla.replace('{n}', String(n));
          const pistas = ['Pista 1.', 'Pista 2.', 'Pista 3.'];
          pistas[donde] = texto;
          const p = { ...practica, pistas };
          const res: Reservados = { numeros: [n], frases: [] };
          for (let m = 0; m < 3; m++) {
            const servida = elegirPista(p, { mostradas: m }, res);
            const nums = extraerNumeros(servida.texto);
            expect(nums.some((x) => Math.abs(x - n) <= 0.03 * Math.abs(n)), servida.texto).toBe(false);
            expect(pistaNoRevela(servida.texto, res).ok).toBe(true);
          }
        },
      ),
    );
  });

  it('replaces a leaking hint with a safe generic one and says so', () => {
    const p = { ...practica, pistas: ['Mira la cuerda.', 'Da 1.55 segundos.', 'Compara.'] };
    const servida = elegirPista(p, { mostradas: 1 }, reservados);
    expect(servida.sustituida).toBe(true);
    expect(servida.texto).not.toMatch(/1[.,]55/);
    expect(servida.nivel).toBe(2);
  });
});
