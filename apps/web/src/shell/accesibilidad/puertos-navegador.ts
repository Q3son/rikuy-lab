/**
 * Browser adapters for the narrator ports, plus the registry where F9 hands over the audio manifest.
 * Everything here tolerates missing APIs: a phone without speechSynthesis or Audio just gets text.
 */
import type { Lengua } from '@rikuy/contracts';
import type { EntradaAudio, PuertoAudio, PuertoVoz } from './narrador.ts';

export function crearPuertoVozNavegador(synth: SpeechSynthesis | undefined = globalThis.speechSynthesis): PuertoVoz {
  return {
    voces: () => (synth ? synth.getVoices() : []),
    hablar(texto, voz, cb) {
      if (!synth || typeof SpeechSynthesisUtterance === 'undefined') {
        cb.onError?.();
        return;
      }
      const u = new SpeechSynthesisUtterance(texto);
      if (voz) u.voice = voz;
      u.lang = voz?.lang ?? 'es-PE';
      u.rate = cb.rate;
      u.onend = () => cb.onFin();
      u.onerror = () => (cb.onError ?? cb.onFin)();
      u.onboundary = (e) => {
        if (e.name === 'word' || e.name === undefined) cb.onLimite?.(e.charIndex);
      };
      synth.speak(u);
    },
    cancelar: () => synth?.cancel(),
  };
}

export function crearPuertoAudioNavegador(): PuertoAudio {
  let actual: HTMLAudioElement | null = null;
  return {
    reproducir(url, cb) {
      if (typeof Audio === 'undefined') {
        cb.onError?.();
        return;
      }
      actual?.pause();
      const el = new Audio(url);
      actual = el;
      el.playbackRate = cb.rate;
      el.onended = () => cb.onFin();
      el.onerror = () => (cb.onError ?? cb.onFin)();
      void el.play().catch(() => (cb.onError ?? cb.onFin)());
    },
    detener() {
      actual?.pause();
      actual = null;
    },
  };
}

const registro = new Map<string, EntradaAudio>();
const claveRegistro = (clave: string, lengua: Lengua) => `${lengua}:${clave}`;

/**
 * F9 calls this once at boot with the entries of the audio manifest. Only entries whose state is
 * reviewed should be registered: a draft recording is never played.
 */
export function registrarManifiestoAudio(entradas: readonly EntradaAudio[]): void {
  for (const e of entradas) registro.set(claveRegistro(e.clave, e.lengua), e);
}

export function limpiarManifiestoAudio(): void {
  registro.clear();
}

export function buscarEnManifiesto(clave: string, lengua: Lengua): EntradaAudio | undefined {
  return registro.get(claveRegistro(clave, lengua));
}
