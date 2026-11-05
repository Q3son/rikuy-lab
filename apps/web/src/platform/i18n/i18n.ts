import type { Lengua } from '@rikuy/contracts';
import i18next, { type i18n as I18n } from 'i18next';
import ICU from 'i18next-icu';
import { es } from './catalogos/es.ts';
import { quy } from './catalogos/quy.ts';
import { recursosRevisados, type CatalogoLengua } from './registro.ts';

/** Catalogs shipped in the UI. Spanish and Quechua first; a new language is one more entry. */
export const LENGUAS_DE_LA_UI: CatalogoLengua[] = [es, quy];

/** Fallback chain: any language falls back to Spanish, key by key. */
const RESPALDO = { quy: ['es'], quz: ['es'], ayr: ['es'], default: ['es'] };

export async function crearI18n(opciones: { lengua?: Lengua; catalogos?: CatalogoLengua[] } = {}): Promise<I18n> {
  const { lengua = 'es', catalogos = LENGUAS_DE_LA_UI } = opciones;
  const resources = Object.fromEntries(catalogos.map((c) => [c.lengua, { translation: recursosRevisados(c) }]));
  const instancia = i18next.createInstance();
  await instancia.use(ICU).init({
    lng: lengua,
    fallbackLng: RESPALDO,
    resources,
    // Flat keys such as "tabs.museo": no nesting, so catalogs stay simple lists to review.
    keySeparator: false,
    nsSeparator: false,
    interpolation: { escapeValue: false },
    returnNull: false,
  });
  if (typeof document !== 'undefined') document.documentElement.lang = lengua;
  return instancia;
}

/** Changes the language and keeps `<html lang>` in sync (screen readers pick the right voice). */
export async function cambiarLengua(instancia: I18n, lengua: Lengua): Promise<void> {
  await instancia.changeLanguage(lengua);
  if (typeof document !== 'undefined') document.documentElement.lang = lengua;
}
