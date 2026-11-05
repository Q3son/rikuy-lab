import { Apodo, Clase, RUTAS } from '@rikuy/contracts';
import { beforeEach, describe, expect, it } from 'vitest';
import { mapearUrlVieja } from '../app/urlVieja.ts';
import { FLAGS_POR_DEFECTO, leerFlags } from '../app/flags.ts';
import { TABS_DOCENTE, TABS_ESTUDIANTE, tabActivo, rutaSinMarco } from './navegacion.ts';
import { efectosDeNivel } from './nivel.ts';
import { APODOS, normalizarCodigo, validarUnirse } from './unirse.ts';
import { estadoDeRed, useRed } from './estado.ts';
import { useSesion } from './sesion.ts';

describe('tab sets per role', () => {
  it('student tabs are Museo, Lab, Cerebro, Quipu, Yo', () => {
    expect(TABS_ESTUDIANTE.map((t) => t.id)).toEqual(['museo', 'lab', 'cerebro', 'quipu', 'yo']);
  });

  it('teacher tabs are Hoy, Clase, Evidencia, Reportes, Ajustes', () => {
    expect(TABS_DOCENTE.map((t) => t.id)).toEqual(['hoy', 'clase', 'evidencia', 'reportes', 'ajustes']);
  });

  it('keeps the shared route constants of contracts where they exist', () => {
    const rutas = Object.fromEntries([...TABS_ESTUDIANTE, ...TABS_DOCENTE].map((t) => [t.id, t.ruta]));
    expect(rutas.museo).toBe(RUTAS.museo);
    expect(rutas.cerebro).toBe(RUTAS.cerebro);
    expect(rutas.clase).toBe(RUTAS.clase);
    expect(rutas.ajustes).toBe(RUTAS.ajustes);
  });

  it('highlights the tab that owns the current route, including nested routes of other fronts', () => {
    expect(tabActivo('/museo', 'grupo')).toBe('museo');
    expect(tabActivo('/museo/sala-fisica', 'grupo')).toBe('museo');
    expect(tabActivo('/retos', 'grupo')).toBe('museo');
    expect(tabActivo('/lab', 'grupo')).toBe('lab');
    expect(tabActivo('/lab/pendulo', 'grupo')).toBe('lab');
    expect(tabActivo('/exhibicion/exh-pendulo', 'grupo')).toBe('lab');
    expect(tabActivo('/relevo', 'grupo')).toBe('yo');
    expect(tabActivo('/hoy', 'docente')).toBe('hoy');
    expect(tabActivo('/creador', 'docente')).toBe('clase');
    expect(tabActivo('/relevo', 'docente')).toBe('evidencia');
    expect(tabActivo('/docente/evidencias', 'docente')).toBe('evidencia');
    expect(tabActivo('/holo', 'docente')).toBeNull();
  });

  it('shows no chrome on the entry screens, the family page and the display phone', () => {
    for (const ruta of ['/', '/entrar', '/p/abc123', '/holo', '/display.html']) expect(rutaSinMarco(ruta)).toBe(true);
    for (const ruta of ['/museo', '/hoy', '/lab/pendulo']) expect(rutaSinMarco(ruta)).toBe(false);
  });
});

describe('join by class code and nickname', () => {
  it('normalises the code: spaces and hyphens are dropped, letters are upper case', () => {
    expect(normalizarCodigo(' cyt-2b4 ')).toBe('CYT2B4');
    expect(normalizarCodigo('abc 123')).toBe('ABC123');
  });

  it('accepts a 6 character code and a nickname from the closed list', () => {
    expect(validarUnirse('cyt2b4', 'Puma')).toEqual({ ok: true, codigo: 'CYT2B4', apodo: 'Puma' });
  });

  it('rejects malformed codes and missing or invented nicknames, naming what to fix', () => {
    expect(validarUnirse('abc', 'Puma')).toEqual({ ok: false, errores: { codigo: 'unirse.errorCodigo' } });
    expect(validarUnirse('ABC12!', 'Puma')).toMatchObject({ ok: false });
    expect(validarUnirse('ABC123', '')).toEqual({ ok: false, errores: { apodo: 'unirse.errorApodo' } });
    expect(validarUnirse('ABC123', 'Marlene')).toEqual({ ok: false, errores: { apodo: 'unirse.errorApodo' } });
    expect(validarUnirse('', '')).toEqual({ ok: false, errores: { codigo: 'unirse.errorCodigo', apodo: 'unirse.errorApodo' } });
  });

  it('stays in lockstep with the contracts (class code format and the closed nickname list)', () => {
    expect([...APODOS]).toEqual([...Apodo.options]);
    for (const codigo of ['ABC123', 'ZZZ999', 'AAAAAA']) {
      expect(Clase.shape.codigo.safeParse(codigo).success).toBe(true);
      expect(validarUnirse(codigo, 'Puma').ok).toBe(true);
    }
    for (const codigo of ['abc12', 'ABC1234', 'AB-123']) {
      expect(Clase.shape.codigo.safeParse(codigo).success).toBe(false);
    }
  });
});

describe('level of support (Milo): how we want to work today', () => {
  it('"con apoyo" turns on more pictograms, audio and shorter hints', () => {
    expect(efectosDeNivel('apoyo')).toEqual({ pictogramas: true, modoAudio: true, densidadPistas: 'cortas' });
  });

  it('"normal" changes nothing and "desafío" gives one hint less with more open questions', () => {
    expect(efectosDeNivel('normal')).toEqual({ pictogramas: false, modoAudio: false, densidadPistas: 'normal' });
    expect(efectosDeNivel('desafio')).toEqual({ pictogramas: false, modoAudio: false, densidadPistas: 'menos', preguntasAbiertas: true });
  });
});

describe('session store', () => {
  beforeEach(() => {
    localStorage.clear();
    useSesion.getState().salir();
  });

  it('starts without a role and remembers the chosen one on this device', () => {
    expect(useSesion.getState().rol).toBeNull();
    useSesion.getState().elegirRol('docente');
    expect(useSesion.getState().rol).toBe('docente');
    expect(JSON.parse(localStorage.getItem('rikuy.sesion') ?? '{}').state.rol).toBe('docente');
  });

  it('joining stores code, nickname and the chosen level, and never anything about a student', () => {
    useSesion.getState().elegirRol('grupo');
    useSesion.getState().unirse({ codigo: 'CYT2B4', apodo: 'Puma', nivel: 'apoyo' });
    const s = useSesion.getState();
    expect(s).toMatchObject({ rol: 'grupo', codigoClase: 'CYT2B4', apodo: 'Puma', nivel: 'apoyo' });
    const guardado = JSON.parse(localStorage.getItem('rikuy.sesion') ?? '{}').state as Record<string, unknown>;
    expect(Object.keys(guardado).sort()).toEqual(['apodo', 'codigoClase', 'nivel', 'rol']);
  });

  it('leaving the class forgets the group but keeps the role', () => {
    useSesion.getState().elegirRol('grupo');
    useSesion.getState().unirse({ codigo: 'CYT2B4', apodo: 'Puma', nivel: 'normal' });
    useSesion.getState().salirDeLaClase();
    expect(useSesion.getState()).toMatchObject({ rol: 'grupo', codigoClase: null, apodo: null });
  });
});

describe('network state of the chip', () => {
  it('maps connectivity and the queue to the five states, always with a sentence', () => {
    expect(estadoDeRed({ enLinea: false, pendientes: 0, enviando: false, error: false })).toEqual({ estado: 'sin-red', clave: 'red.sinRed' });
    expect(estadoDeRed({ enLinea: false, pendientes: 3, enviando: false, error: false })).toEqual({ estado: 'por-enviar', clave: 'red.porEnviar', conteo: 3 });
    expect(estadoDeRed({ enLinea: true, pendientes: 2, enviando: true, error: false })).toEqual({ estado: 'enviando', clave: 'red.enviando' });
    expect(estadoDeRed({ enLinea: true, pendientes: 0, enviando: false, error: true })).toEqual({ estado: 'error', clave: 'red.error' });
    expect(estadoDeRed({ enLinea: true, pendientes: 0, enviando: false, error: false })).toEqual({ estado: 'enviado', clave: 'red.conRed' });
  });

  it('F2 reports the queue through the store', () => {
    useRed.getState().reportar({ pendientes: 4 });
    expect(useRed.getState().pendientes).toBe(4);
  });
});

describe('old URLs redirect to the hash router', () => {
  const base = 'https://rikuy.test/';
  it('display.html?sala=... becomes #/holo with the same query', () => {
    expect(mapearUrlVieja(new URL(`${base}display.html?sala=ABC&x=1`))).toBe('#/holo?modo=display&sala=ABC&x=1');
  });

  it('control.html, panel.html and clasico.html have their new homes', () => {
    expect(mapearUrlVieja(new URL(`${base}control.html?sala=ABC`))).toBe('#/holo?modo=control&sala=ABC');
    expect(mapearUrlVieja(new URL(`${base}panel.html?sala=ABC`))).toBe('#/docente?sala=ABC');
    expect(mapearUrlVieja(new URL(`${base}clasico.html`))).toBe('#/holo?modo=clasico');
  });

  it('works in a subfolder (GitHub Pages) and leaves current URLs alone', () => {
    expect(mapearUrlVieja(new URL('https://q3son.github.io/rikuy-lab/display.html?sala=Z'))).toBe('#/holo?modo=display&sala=Z');
    expect(mapearUrlVieja(new URL(`${base}index.html`))).toBeNull();
    expect(mapearUrlVieja(new URL(`${base}`))).toBeNull();
    expect(mapearUrlVieja(new URL(`${base}#/museo`))).toBeNull();
  });
});

describe('feature flags', () => {
  it('start all off: senales, gestos, webrtc, iaLocal, iaNube', () => {
    expect(FLAGS_POR_DEFECTO).toEqual({ senales: false, gestos: false, webrtc: false, iaLocal: false, iaNube: false });
  });

  it('can be switched on from storage for development, ignoring junk', () => {
    expect(leerFlags('{"gestos":true,"iaNube":"yes","raro":true}')).toEqual({ ...FLAGS_POR_DEFECTO, gestos: true });
    expect(leerFlags('no es json')).toEqual(FLAGS_POR_DEFECTO);
    expect(leerFlags(null)).toEqual(FLAGS_POR_DEFECTO);
  });
});
