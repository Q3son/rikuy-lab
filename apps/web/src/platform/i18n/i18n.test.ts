import { readdirSync, readFileSync, statSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { describe, expect, it } from 'vitest';
import { es } from './catalogos/es.ts';
import { quy } from './catalogos/quy.ts';
import { cambiarLengua, crearI18n, LENGUAS_DE_LA_UI } from './i18n.ts';
import { estadoRevision, recursosRevisados, type CatalogoLengua } from './registro.ts';
import { esLenguaConVozSintetica, seleccionarVozEs } from './tts.ts';

describe('catalog registry', () => {
  it('registers Spanish and Quechua first, and nothing else yet', () => {
    expect(LENGUAS_DE_LA_UI.map((c) => c.lengua)).toEqual(['es', 'quy']);
  });

  it('every Quechua key exists in Spanish, so a fallback is always possible', () => {
    const huerfanas = Object.keys(quy.cadenas).filter((k) => !(k in es.cadenas));
    expect(huerfanas).toEqual([]);
  });

  it('ships no Quechua string as reviewed: all are provisional until a native speaker validates them', () => {
    const revisadas = Object.values(quy.cadenas).filter((c) => typeof c === 'string' || c.revisado);
    expect(revisadas).toEqual([]);
  });

  it('counts reviewed strings per language', () => {
    expect(estadoRevision(es)).toEqual({ revisadas: Object.keys(es.cadenas).length, total: Object.keys(es.cadenas).length });
    expect(estadoRevision(quy).revisadas).toBe(0);
    expect(estadoRevision(quy).total).toBe(Object.keys(quy.cadenas).length);
  });

  it('only reviewed strings become i18next resources', () => {
    const prueba: CatalogoLengua = {
      lengua: 'quy',
      nombre: 'Prueba',
      cadenas: { a: { texto: 'revisada', revisado: true }, b: { texto: 'borrador', revisado: false }, c: 'texto plano' },
    };
    expect(recursosRevisados(prueba)).toEqual({ a: 'revisada', c: 'texto plano' });
  });
});

describe('i18next with ICU', () => {
  it('translates and pluralises in Spanish', async () => {
    const i18n = await crearI18n({ lengua: 'es' });
    expect(i18n.t('tabs.museo')).toBe('Museo');
    expect(i18n.t('red.porEnviar', { count: 1 })).toBe('1 medición por enviar');
    expect(i18n.t('red.porEnviar', { count: 3 })).toBe('3 mediciones por enviar');
  });

  it('with quy active, unreviewed keys fall back to Spanish (gate of F1)', async () => {
    const i18n = await crearI18n({ lengua: 'quy' });
    expect(i18n.language).toBe('quy');
    expect(i18n.t('tabs.museo')).toBe('Museo');
    expect(i18n.t('roles.docente.titulo')).toBe(es.cadenas['roles.docente.titulo']);
  });

  it('with quy active, a reviewed key shows the Quechua text', async () => {
    const catalogoRevisado: CatalogoLengua = { ...quy, cadenas: { ...quy.cadenas, 'tabs.museo': { texto: 'Yachay wasi', revisado: true } } };
    const i18n = await crearI18n({ lengua: 'quy', catalogos: [es, catalogoRevisado] });
    expect(i18n.t('tabs.museo')).toBe('Yachay wasi');
    expect(i18n.t('tabs.lab')).toBe('Lab');
  });

  it('switching language updates the document language attribute', async () => {
    const i18n = await crearI18n({ lengua: 'es' });
    await cambiarLengua(i18n, 'quy');
    expect(i18n.language).toBe('quy');
    expect(document.documentElement.lang).toBe('quy');
    await cambiarLengua(i18n, 'es');
    expect(document.documentElement.lang).toBe('es');
  });

  it('adding a language is registering a catalog, no code change', async () => {
    const quz: CatalogoLengua = { lengua: 'quz', nombre: 'Quechua cusqueño', cadenas: { 'tabs.museo': { texto: 'Yachay wasi', revisado: true } } };
    const i18n = await crearI18n({ lengua: 'quz', catalogos: [es, quz] });
    expect(i18n.t('tabs.museo')).toBe('Yachay wasi');
    expect(i18n.t('tabs.lab')).toBe('Lab');
  });
});

describe('every key used by the code exists in the Spanish catalog', () => {
  const raiz = resolve(import.meta.dirname, '../..');
  const archivos: string[] = [];
  const recorrer = (dir: string) => {
    for (const nombre of readdirSync(dir)) {
      const ruta = join(dir, nombre);
      if (statSync(ruta).isDirectory()) recorrer(ruta);
      else if (/\.tsx?$/.test(nombre) && !/\.test\.tsx?$/.test(nombre) && !ruta.includes('catalogos')) archivos.push(ruta);
    }
  };
  recorrer(raiz);

  it('finds the literal t("...") keys and each one is defined', () => {
    const usadas = new Set<string>();
    for (const archivo of archivos) {
      const texto = readFileSync(archivo, 'utf8');
      for (const m of texto.matchAll(/\bt\(\s*'([A-Za-z0-9_.]+)'/g)) usadas.add(m[1]!);
    }
    expect(usadas.size).toBeGreaterThan(20);
    const faltan = [...usadas].filter((k) => !(k in es.cadenas));
    expect(faltan).toEqual([]);
  });
});

describe('text to speech is Spanish only', () => {
  it('never offers a synthetic voice for Quechua, Aymara or any other language', () => {
    expect(esLenguaConVozSintetica('es')).toBe(true);
    for (const l of ['quy', 'quz', 'ayr'] as const) expect(esLenguaConVozSintetica(l)).toBe(false);
  });

  const voz = (name: string, lang: string, localService: boolean) => ({ name, lang, localService, default: false, voiceURI: name }) as SpeechSynthesisVoice;

  it('prefers an offline Spanish voice, Peruvian first', () => {
    const v = seleccionarVozEs([voz('Google es-ES', 'es-ES', false), voz('Local es-MX', 'es-MX', true), voz('Local es-PE', 'es-PE', true), voz('English', 'en-US', true)]);
    expect(v?.name).toBe('Local es-PE');
  });

  it('falls back to an online Spanish voice and reports none when there is no Spanish voice', () => {
    expect(seleccionarVozEs([voz('Google es-ES', 'es-ES', false)])?.name).toBe('Google es-ES');
    expect(seleccionarVozEs([voz('English', 'en-US', true)])).toBeNull();
    expect(seleccionarVozEs([])).toBeNull();
  });

  it('can require an offline voice only', () => {
    expect(seleccionarVozEs([voz('Google es-ES', 'es-ES', false)], { soloLocales: true })).toBeNull();
  });
});
