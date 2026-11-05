/**
 * Text to speech is for Spanish only (ARQUITECTURA 4.8, DESIGN.md 13). Quechua and Aymara are
 * spoken by recorded native speakers or not at all: a synthetic voice would mispronounce them and
 * is never offered. Voices are chosen from what the device already has, offline voices first.
 */
import type { Lengua } from '@rikuy/contracts';

export function esLenguaConVozSintetica(lengua: Lengua): boolean {
  return lengua === 'es';
}

const PREFERENCIA = ['es-PE', 'es-419', 'es-US', 'es-MX', 'es-CO', 'es-AR', 'es-ES'];

function rangoRegion(lang: string): number {
  const i = PREFERENCIA.findIndex((p) => p.toLowerCase() === lang.toLowerCase().replace('_', '-'));
  return i === -1 ? PREFERENCIA.length : i;
}

/**
 * Picks the best Spanish voice: offline (localService) before online, then Peruvian and Latin
 * American before Peninsular. Returns null when the device has no Spanish voice at all, or when
 * `soloLocales` is set and every Spanish voice needs the network.
 */
export function seleccionarVozEs(voces: readonly SpeechSynthesisVoice[], opciones: { soloLocales?: boolean } = {}): SpeechSynthesisVoice | null {
  const candidatas = voces.filter((v) => v.lang.toLowerCase().startsWith('es') && (!opciones.soloLocales || v.localService));
  if (candidatas.length === 0) return null;
  return [...candidatas].sort((a, b) => Number(b.localService) - Number(a.localService) || rangoRegion(a.lang) - rangoRegion(b.lang))[0] ?? null;
}
