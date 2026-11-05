/**
 * Stopwatch feedback for those who cannot watch the clock (FUNCIONES_EXTRA 4.1): a short beep and a
 * vibration on every oscillation, a longer double beep at the end. Without `navigator.vibrate`,
 * sound only; without Web Audio, vibration only. Never required: the readout stays on screen.
 */
let ctx: AudioContext | null = null;

function audio(): AudioContext | null {
  try {
    const Ctor = globalThis.AudioContext ?? (globalThis as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctor) return null;
    ctx ??= new Ctor();
    if (ctx.state === 'suspended') void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

export function pitido(frecuencia = 880, duracionMs = 90): void {
  const a = audio();
  if (!a) return;
  const osc = a.createOscillator();
  const gain = a.createGain();
  osc.frequency.value = frecuencia;
  gain.gain.setValueAtTime(0.2, a.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, a.currentTime + duracionMs / 1000);
  osc.connect(gain).connect(a.destination);
  osc.start();
  osc.stop(a.currentTime + duracionMs / 1000);
}

export function vibrar(patron: number | number[]): void {
  try {
    navigator.vibrate?.(patron);
  } catch {
    /* not supported */
  }
}

/** `cuenta` 0 = start; `total` = last oscillation. */
export function avisarOscilacion(cuenta: number, total: number): void {
  if (cuenta === 0) {
    pitido(660, 120);
    vibrar(60);
  } else if (cuenta >= total) {
    pitido(1046, 150);
    setTimeout(() => pitido(1318, 220), 180);
    vibrar([80, 60, 160]);
  } else {
    pitido(880, 80);
    vibrar(40);
  }
}
