import type { CatalogoLengua } from '../registro.ts';

/**
 * Quechua placeholder catalog (southern Quechua, Ayacucho-Chanka). Every string is PROVISIONAL and
 * marked `revisado: false`: they come from the word table of DESIGN.md 13, which a native speaker and
 * EIB teachers must validate before release. Unreviewed strings are never shown; the UI falls back
 * to Spanish. To publish one, validate it and flip its flag. Never machine-translate, never TTS.
 */
const provisional = (texto: string) => ({ texto, revisado: false });

export const quy: CatalogoLengua = {
  lengua: 'quy',
  nombre: 'Runasimi',
  variedad: 'Ayacucho-Chanka',
  cadenas: {
    'app.nombre': provisional('Rikuy'),
    'tabs.museo': provisional('Yachay wasi'),
    'tabs.quipu': provisional('Khipu'),
    'tabs.cerebro': provisional('Yuyay'),
    'hoy.paso.llevar': provisional('Apay'),
  },
};
