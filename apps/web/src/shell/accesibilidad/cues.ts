/**
 * Cues: every sound has a visual equivalent (FUNCIONES_EXTRA 4.1: "ningún paso exige oír").
 * `emitir` ALWAYS shows the text; the beep and the vibration are extras the person can turn off.
 * The text is mandatory: a cue without words would be silent for deaf users.
 */
import type { Haptica, PatronHaptico } from '@rikuy/ui';

export type TipoCue = 'oscilacion' | 'exito' | 'aviso' | 'nudo';
export interface CueVisible {
  tipo: TipoCue;
  texto: string;
}

const HAPTICO: Record<TipoCue, PatronHaptico> = { oscilacion: 'toque', exito: 'exito', aviso: 'aviso', nudo: 'nudo' };

export function crearCues(deps: { mostrar: (cue: CueVisible) => void; sonido: (tipo: TipoCue) => void; sonidoActivo: () => boolean; haptica: Pick<Haptica, 'pulso' | 'disponible'> }) {
  return {
    emitir(tipo: TipoCue, texto: string): void {
      if (!texto.trim()) throw new Error(`A ${tipo} cue needs a text: every sound has a visual equivalent`);
      deps.mostrar({ tipo, texto });
      if (deps.sonidoActivo()) deps.sonido(tipo);
      deps.haptica.pulso(HAPTICO[tipo]);
    },
  };
}

const FRECUENCIAS: Record<TipoCue, number[]> = { oscilacion: [880], exito: [660, 880], aviso: [440, 330], nudo: [523, 659, 784] };

/** Short beeps with the Web Audio API; silent where it does not exist. Nothing is downloaded. */
export function crearSonidoWebAudio(): (tipo: TipoCue) => void {
  let contexto: AudioContext | null = null;
  return (tipo) => {
    const Ctor = globalThis.AudioContext;
    if (!Ctor) return;
    contexto ??= new Ctor();
    const ctx = contexto;
    let inicio = ctx.currentTime;
    for (const frecuencia of FRECUENCIAS[tipo]) {
      const osc = ctx.createOscillator();
      const ganancia = ctx.createGain();
      osc.frequency.value = frecuencia;
      ganancia.gain.setValueAtTime(0.15, inicio);
      ganancia.gain.exponentialRampToValueAtTime(0.001, inicio + 0.12);
      osc.connect(ganancia).connect(ctx.destination);
      osc.start(inicio);
      osc.stop(inicio + 0.13);
      inicio += 0.14;
    }
  };
}
