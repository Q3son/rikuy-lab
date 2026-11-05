/**
 * Narrator engine of the audio mode (FUNCIONES_EXTRA 4.1 and 4.3).
 *
 * Order of preference for every block of text:
 *   1. a prerecorded audio of the manifest (F9) for the active language, Spanish included;
 *   2. the device voice (speechSynthesis), Spanish only, local voices only unless the cloud is
 *      explicitly allowed (then a cloud notice is raised);
 *   3. text only, with a notice. The text is always on screen as captions.
 * Quechua, Aymara and every other language never use a synthetic voice.
 * "Use only my screen reader" turns Rikuy's voice off completely to avoid a double voice.
 *
 * The engine is pure TypeScript over three ports (voice, audio, manifest), so it is tested without
 * a browser and F3 (voice and sensors) can reuse it.
 */
import type { Lengua } from '@rikuy/contracts';
import { esLenguaConVozSintetica, seleccionarVozEs } from '../../platform/i18n/tts.ts';

export interface EntradaAudio {
  clave: string;
  lengua: Lengua;
  sha256: string;
  bytes: number;
  /** Optional explicit URL; otherwise `./audio/<sha256>.opus` (content addressed, precached). */
  url?: string;
}

export interface PuertoVoz {
  voces(): SpeechSynthesisVoice[];
  hablar(texto: string, voz: SpeechSynthesisVoice | null, cb: { rate: number; onFin: () => void; onError?: () => void; onLimite?: (charIndex: number) => void }): void;
  cancelar(): void;
}

export interface PuertoAudio {
  reproducir(url: string, cb: { rate: number; onFin: () => void; onError?: () => void }): void;
  detener(): void;
}

export interface Fragmento {
  /** Stable id of the block (a card, a plaque, the screen). */
  id: string;
  /** Key of the recording in the audio manifest, when the block has one. */
  clave?: string;
  texto: string;
}

export type Rango = { inicio: number; fin: number };
export type Aviso = 'sin-voz' | 'sin-grabacion' | 'nube' | null;
export type ResultadoNarracion = 'hablando' | 'sin-voz' | 'sin-grabacion' | 'lector-externo';
export type Disponibilidad = 'ok-grabacion' | 'ok-voz' | 'sin-voz' | 'sin-grabacion' | 'lector-externo';

export interface EstadoNarrador {
  hablando: string | null;
  /** Text being narrated, in the language being narrated: the captions. */
  subtitulo: string | null;
  resaltado: Rango | null;
  aviso: Aviso;
}

export interface OpcionesNarrador {
  lengua: () => Lengua;
  voz: PuertoVoz;
  audio: PuertoAudio;
  manifiesto: (clave: string, lengua: Lengua) => EntradaAudio | undefined;
  enLinea?: () => boolean;
  velocidad?: () => number;
  soloLectorPantalla?: () => boolean;
  permitirVozEnNube?: boolean;
  urlDe?: (entrada: EntradaAudio) => string;
}

const ESTADO_INICIAL: EstadoNarrador = { hablando: null, subtitulo: null, resaltado: null, aviso: null };

/** End of the word that starts at `inicio` (speechSynthesis boundary events only give the start). */
function finDePalabra(texto: string, inicio: number): number {
  const siguiente = texto.indexOf(' ', inicio);
  return siguiente === -1 ? texto.length : siguiente;
}

export function crearNarrador(opciones: OpcionesNarrador) {
  const { lengua, voz, audio, manifiesto } = opciones;
  const enLinea = opciones.enLinea ?? (() => true);
  const velocidad = opciones.velocidad ?? (() => 1);
  const urlDe = opciones.urlDe ?? ((e: EntradaAudio) => e.url ?? `./audio/${e.sha256}.opus`);
  let estado: EstadoNarrador = ESTADO_INICIAL;
  const oyentes = new Set<() => void>();

  const poner = (parcial: Partial<EstadoNarrador>) => {
    estado = { ...estado, ...parcial };
    oyentes.forEach((o) => o());
  };

  const elegirVoz = () => {
    const soloLocales = !(opciones.permitirVozEnNube && enLinea());
    return seleccionarVozEs(voz.voces(), { soloLocales });
  };

  const disponibilidad = (f: Fragmento): Disponibilidad => {
    if (opciones.soloLectorPantalla?.()) return 'lector-externo';
    const l = lengua();
    if (f.clave && manifiesto(f.clave, l)) return 'ok-grabacion';
    if (!esLenguaConVozSintetica(l)) return 'sin-grabacion';
    return elegirVoz() ? 'ok-voz' : 'sin-voz';
  };

  const detener = () => {
    voz.cancelar();
    audio.detener();
    estado = { ...estado, hablando: null, subtitulo: null, resaltado: null };
    oyentes.forEach((o) => o());
  };

  const terminar = (id: string) => () => {
    if (estado.hablando !== id) return;
    poner({ hablando: null, subtitulo: null, resaltado: null });
  };

  const narrar = async (f: Fragmento): Promise<ResultadoNarracion> => {
    detener();
    const d = disponibilidad(f);
    if (d === 'lector-externo') return 'lector-externo';
    const l = lengua();
    const rate = velocidad();

    if (d === 'ok-grabacion') {
      const entrada = manifiesto(f.clave!, l)!;
      poner({ hablando: f.id, subtitulo: f.texto, resaltado: { inicio: 0, fin: f.texto.length }, aviso: null });
      audio.reproducir(urlDe(entrada), { rate, onFin: terminar(f.id), onError: terminar(f.id) });
      return 'hablando';
    }
    if (d === 'ok-voz') {
      const v = elegirVoz();
      const esNube = v ? !v.localService : false;
      poner({ hablando: f.id, subtitulo: f.texto, resaltado: null, aviso: esNube ? 'nube' : null });
      voz.hablar(f.texto, v, {
        rate,
        onFin: terminar(f.id),
        onError: terminar(f.id),
        onLimite: (i) => {
          if (estado.hablando === f.id) poner({ resaltado: { inicio: i, fin: finDePalabra(f.texto, i) } });
        },
      });
      return 'hablando';
    }
    // No sound possible: the text stays visible as captions and a notice says why. Never blocks.
    poner({ hablando: null, subtitulo: f.texto, resaltado: null, aviso: d });
    return d;
  };

  return {
    narrar,
    detener,
    /** Toggle used by the speak / stop buttons. */
    async alternar(f: Fragmento): Promise<ResultadoNarracion | 'detenido'> {
      if (estado.hablando === f.id) {
        detener();
        return 'detenido';
      }
      return narrar(f);
    },
    disponibilidad,
    estado: () => estado,
    suscribir(oyente: () => void) {
      oyentes.add(oyente);
      return () => oyentes.delete(oyente);
    },
  };
}

export type Narrador = ReturnType<typeof crearNarrador>;
