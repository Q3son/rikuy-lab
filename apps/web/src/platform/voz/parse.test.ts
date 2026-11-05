import { describe, expect, it } from 'vitest';
import { parseSpokenNumber, parseVoiceCommand } from './parse.ts';

describe('parseVoiceCommand (voice fallback of the control phone)', () => {
  it.each([
    ['gíralo a la izquierda', { type: 'rotate', dx: -0.6, dy: 0 }],
    ['gira a la derecha', { type: 'rotate', dx: 0.6, dy: 0 }],
    ['gira', { type: 'rotate', dx: 0.6, dy: 0 }],
    ['acércalo', { type: 'zoom', factor: 1.25 }],
    ['más grande', { type: 'zoom', factor: 1.25 }],
    ['aléjalo', { type: 'zoom', factor: 0.8 }],
    ['pausa', { type: 'pause' }],
    ['detente', { type: 'pause' }],
    ['suelta el péndulo', { type: 'release' }],
    ['¡dale!', { type: 'release' }],
    ['centra la vista', { type: 'center' }],
  ])('"%s"', (text, action) => {
    expect(parseVoiceCommand(text)).toEqual(action);
  });

  it('returns null for anything else', () => {
    expect(parseVoiceCommand('¿por qué tarda más?')).toBeNull();
  });
});

describe('parseSpokenNumber ("Dicta tu dato")', () => {
  it.each([
    ['diez coma tres', 10.3],
    ['10,3', 10.3],
    ['10.3 segundos', 10.3],
    ['catorce', 14],
    ['veinte coma nueve', 20.9],
    ['veintiuno coma cinco', 21.5],
    ['treinta y uno', 31],
    ['treinta y uno coma cero cinco', 31.05],
    ['cero coma ocho', 0.8],
    ['catorce punto dos', 14.2],
    ['mide dieciséis coma cuatro segundos', 16.4],
    ['cien', 100],
  ])('"%s" → %s', (text, value) => {
    expect(parseSpokenNumber(text)).toBeCloseTo(value, 10);
  });

  it.each(['hola', '', 'coma'])('"%s" → null', (text) => {
    expect(parseSpokenNumber(text)).toBeNull();
  });
});
