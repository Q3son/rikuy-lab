import { comandoJsonSchema, HERRAMIENTAS } from '@rikuy/contracts';
import { describe, expect, it } from 'vitest';
import { conformaEsquema, herramientasDelEsquema, mensajeParaReintento, validarComandos, type ContextoValidacion } from './validar.ts';

const ctx: ContextoValidacion = {
  escenas: ['pendulo', 'lactasa', 'higado'],
  variables: [
    { id: 'longitud', min: 0.2, max: 1.5 },
    { id: 'masa', min: 0.05, max: 2 },
  ],
  escalera: { mostradas: 0 },
};

const errores = (entrada: unknown, c: ContextoValidacion = ctx) => {
  const r = validarComandos(entrada, c);
  return r.ok ? [] : r.error.map((e) => e.codigo);
};

describe('schema is the single source of the tool list', () => {
  it('the JSON Schema the LLM sees lists exactly the contract tools', () => {
    expect([...herramientasDelEsquema()].sort()).toEqual([...HERRAMIENTAS].sort());
  });
  it('conformaEsquema agrees with the generated JSON Schema', () => {
    const esquema = comandoJsonSchema();
    expect(conformaEsquema({ tool: 'correr', args: {} }, esquema)).toBe(true);
    expect(conformaEsquema({ tool: 'fijar_variable', args: { variable: 'masa', valor: 1 } }, esquema)).toBe(true);
    expect(conformaEsquema({ tool: 'fijar_variable', args: { variable: 'masa' } }, esquema)).toBe(false);
    expect(conformaEsquema({ tool: 'borrar_todo', args: {} }, esquema)).toBe(false);
    expect(conformaEsquema({ tool: 'correr', args: {}, extra: 1 }, esquema)).toBe(false);
    expect(conformaEsquema({ tool: 'zoom', args: { factor: -1 } }, esquema)).toBe(false);
  });
});

describe('validarComandos: accepts valid commands', () => {
  it('passes a clean list through unchanged', () => {
    const lista = [
      { tool: 'ir_a', args: { escena: 'pendulo' } },
      { tool: 'fijar_variable', args: { variable: 'longitud', valor: 0.8 } },
      { tool: 'correr', args: {} },
    ];
    const r = validarComandos(lista, ctx);
    expect(r).toEqual({ ok: true, valor: lista });
  });
  it('accepts a JSON string (raw LLM output) and an object with `comandos`', () => {
    expect(validarComandos(JSON.stringify([{ tool: 'pausar', args: {} }]), ctx).ok).toBe(true);
    expect(validarComandos({ comandos: [{ tool: 'pausar', args: {} }] }, ctx).ok).toBe(true);
    expect(validarComandos('', ctx).ok).toBe(false);
    expect(errores('{no es json')).toEqual(['json']);
  });
});

describe('validarComandos: domain rules', () => {
  it('rejects unknown tools and malformed arguments (schema)', () => {
    expect(errores([{ tool: 'borrar_todo', args: {} }])).toEqual(['esquema']);
    expect(errores([{ tool: 'zoom', args: { factor: 0 } }])).toEqual(['esquema']);
    expect(errores([{ tool: 'rotar', args: { yaw: 999 } }])).toEqual(['esquema']);
  });
  it('rejects a scene that is not registered', () => {
    expect(errores([{ tool: 'ir_a', args: { escena: 'mitocondria' } }])).toEqual(['escena_inexistente']);
  });
  it('rejects a variable that does not belong to the practice', () => {
    expect(errores([{ tool: 'fijar_variable', args: { variable: 'temperatura', valor: 40 } }])).toEqual(['variable_ajena']);
  });
  it('rejects values out of range', () => {
    expect(errores([{ tool: 'fijar_variable', args: { variable: 'longitud', valor: 9 } }])).toEqual(['fuera_de_rango']);
    expect(errores([{ tool: 'fijar_variable', args: { variable: 'longitud', valor: 0.05 } }])).toEqual(['fuera_de_rango']);
  });
  it('accepts the boundary values of the range', () => {
    expect(validarComandos([{ tool: 'fijar_variable', args: { variable: 'longitud', valor: 0.2 } }], ctx).ok).toBe(true);
    expect(validarComandos([{ tool: 'fijar_variable', args: { variable: 'longitud', valor: 1.5 } }], ctx).ok).toBe(true);
  });
  it('limits the number of commands per turn', () => {
    expect(errores(Array.from({ length: 7 }, () => ({ tool: 'correr', args: {} })))).toEqual(['demasiados']);
  });
  it('checks highlighted parts only when the scene declares them', () => {
    const conPartes = { ...ctx, partes: ['cuerda', 'masa'] };
    expect(errores([{ tool: 'resaltar', args: { parte: 'tuerca' } }], conPartes)).toEqual(['parte_inexistente']);
    expect(validarComandos([{ tool: 'resaltar', args: { parte: 'cuerda' } }], conPartes).ok).toBe(true);
    expect(validarComandos([{ tool: 'resaltar', args: { parte: 'cualquiera' } }], ctx).ok).toBe(true);
  });
});

describe('validarComandos: dar_pista respects the ladder', () => {
  it('does not jump from nothing to 3 or from 1 to 3', () => {
    expect(errores([{ tool: 'dar_pista', args: { nivel: 3 } }])).toEqual(['pista_salta_escalera']);
    expect(errores([{ tool: 'dar_pista', args: { nivel: 3 } }], { ...ctx, escalera: { mostradas: 1 } })).toEqual(['pista_salta_escalera']);
  });
  it('allows the next rung and a repeat', () => {
    expect(validarComandos([{ tool: 'dar_pista', args: { nivel: 1 } }], ctx).ok).toBe(true);
    expect(validarComandos([{ tool: 'dar_pista', args: { nivel: 3 } }], { ...ctx, escalera: { mostradas: 2 } }).ok).toBe(true);
    expect(validarComandos([{ tool: 'dar_pista', args: { nivel: 1 } }], { ...ctx, escalera: { mostradas: 2 } }).ok).toBe(true);
  });
  it('tracks the ladder inside the same turn', () => {
    expect(
      validarComandos([{ tool: 'dar_pista', args: { nivel: 1 } }, { tool: 'dar_pista', args: { nivel: 2 } }], ctx).ok,
    ).toBe(true);
    expect(errores([{ tool: 'dar_pista', args: { nivel: 1 } }, { tool: 'dar_pista', args: { nivel: 3 } }])).toEqual(['pista_salta_escalera']);
  });
  it('rung 4 does not exist in the tutor ladder (the contract allows 1-4)', () => {
    expect(errores([{ tool: 'dar_pista', args: { nivel: 4 } }], { ...ctx, escalera: { mostradas: 3 } })).toEqual(['pista_salta_escalera']);
  });
});

describe('error reporting', () => {
  it('collects every problem with its index and builds a retry message', () => {
    const r = validarComandos(
      [
        { tool: 'ir_a', args: { escena: 'nada' } },
        { tool: 'correr', args: {} },
        { tool: 'fijar_variable', args: { variable: 'longitud', valor: 100 } },
      ],
      ctx,
    );
    expect(r.ok).toBe(false);
    if (!r.ok) {
      expect(r.error.map((e) => [e.indice, e.codigo])).toEqual([
        [0, 'escena_inexistente'],
        [2, 'fuera_de_rango'],
      ]);
      const msg = mensajeParaReintento(r.error);
      expect(msg).toContain('ir_a');
      expect(msg).toContain('longitud');
    }
  });
});
