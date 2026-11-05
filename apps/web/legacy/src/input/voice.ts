/**
 * Voz: reconocimiento (Web Speech API) y síntesis.
 * Requiere HTTPS. En Chrome para Android funciona; algunos dispositivos
 * reconocen voz sin internet si tienen el paquete de idioma instalado.
 */

type SR = {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: { results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }> }) => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  onend: (() => void) | null;
  start(): void;
  stop(): void;
};

export function voiceSupported(): boolean {
  return Boolean((window as unknown as Record<string, unknown>).SpeechRecognition || (window as unknown as Record<string, unknown>).webkitSpeechRecognition);
}

export class VoiceInput {
  private rec: SR | null = null;
  listening = false;
  onText: (text: string) => void = () => {};
  onInterim: (text: string) => void = () => {};
  onState: (listening: boolean, error?: string) => void = () => {};

  constructor(lang = 'es-PE') {
    const W = window as unknown as { SpeechRecognition?: new () => SR; webkitSpeechRecognition?: new () => SR };
    const Ctor = W.SpeechRecognition ?? W.webkitSpeechRecognition;
    if (!Ctor) return;
    this.rec = new Ctor();
    this.rec.lang = lang;
    this.rec.interimResults = true;
    this.rec.continuous = false;
    this.rec.onresult = (e) => {
      const last = e.results[e.results.length - 1];
      const text = last[0].transcript.trim();
      if (last.isFinal) this.onText(text);
      else this.onInterim(text);
    };
    this.rec.onerror = (e) => this.onState(false, e.error);
    this.rec.onend = () => {
      this.listening = false;
      this.onState(false);
    };
  }

  toggle() {
    if (!this.rec) {
      this.onState(false, 'no-soportado');
      return;
    }
    if (this.listening) {
      this.rec.stop();
      return;
    }
    stopSpeaking();
    this.listening = true;
    this.onState(true);
    try {
      this.rec.start();
    } catch {
      /* ya estaba escuchando */
    }
  }
}

let voice: SpeechSynthesisVoice | null = null;

export function speak(text: string) {
  if (!('speechSynthesis' in window)) return;
  stopSpeaking();
  const u = new SpeechSynthesisUtterance(text);
  voice ??= pickVoice();
  if (voice) u.voice = voice;
  u.lang = voice?.lang ?? 'es-PE';
  u.rate = 1.02;
  speechSynthesis.speak(u);
}

export function stopSpeaking() {
  if ('speechSynthesis' in window) speechSynthesis.cancel();
}

function pickVoice(): SpeechSynthesisVoice | null {
  const voices = speechSynthesis.getVoices();
  return (
    voices.find((v) => v.lang === 'es-PE') ??
    voices.find((v) => v.lang.startsWith('es-4') || v.lang === 'es-MX' || v.lang === 'es-US') ??
    voices.find((v) => v.lang.startsWith('es')) ??
    null
  );
}
