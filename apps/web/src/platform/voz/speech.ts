/**
 * Browser speech adapters (F3, platform/voz). Both are optional: text and buttons always work.
 *  - Recognition (`SpeechRecognition`) may use the cloud on some browsers: the UI says so (2.4).
 *  - Synthesis only with a local voice; otherwise the caller shows the text alone.
 */

interface RecognitionResultEvent {
  results: ArrayLike<ArrayLike<{ transcript: string }> & { isFinal: boolean }>;
}
interface Recognition {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  onresult: ((e: RecognitionResultEvent) => void) | null;
  onend: (() => void) | null;
  onerror: ((e: { error: string }) => void) | null;
  start(): void;
  stop(): void;
}
type RecognitionCtor = new () => Recognition;

function recognitionCtor(): RecognitionCtor | null {
  const w = globalThis as unknown as { SpeechRecognition?: RecognitionCtor; webkitSpeechRecognition?: RecognitionCtor };
  return w.SpeechRecognition ?? w.webkitSpeechRecognition ?? null;
}

export function recognitionSupported(): boolean {
  return recognitionCtor() !== null;
}

/** Listens once (es-PE) and resolves with the final transcript, or null on error or silence. */
export function listenOnce(lang = 'es-PE'): { result: Promise<string | null>; cancel: () => void } {
  const Ctor = recognitionCtor();
  if (!Ctor) return { result: Promise.resolve(null), cancel: () => {} };
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = false;
  rec.continuous = false;
  const result = new Promise<string | null>((resolve) => {
    let text: string | null = null;
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      if (r?.isFinal) text = r[0].transcript;
    };
    rec.onerror = () => resolve(null);
    rec.onend = () => resolve(text);
  });
  try {
    rec.start();
  } catch {
    return { result: Promise.resolve(null), cancel: () => {} };
  }
  return { result, cancel: () => rec.stop() };
}

export type ErrorVoz = 'no-speech' | 'not-allowed' | 'audio-capture' | 'network' | 'no-soportado' | 'otro';

/**
 * Like `listenOnce`, but tells WHY nothing was heard and reports partial text while the
 * person speaks, so the UI can guide them (permission, no microphone, no internet).
 */
export function listenDetailed(
  lang = 'es-PE',
  onInterim?: (text: string) => void,
): { result: Promise<{ text: string | null; error: ErrorVoz | null }>; cancel: () => void } {
  const Ctor = recognitionCtor();
  if (!Ctor) return { result: Promise.resolve({ text: null, error: 'no-soportado' }), cancel: () => {} };
  const rec = new Ctor();
  rec.lang = lang;
  rec.interimResults = true;
  rec.continuous = false;
  const result = new Promise<{ text: string | null; error: ErrorVoz | null }>((resolve) => {
    let text: string | null = null;
    let error: ErrorVoz | null = null;
    rec.onresult = (e) => {
      const r = e.results[e.results.length - 1];
      if (!r) return;
      if (r.isFinal) text = r[0].transcript;
      else onInterim?.(r[0].transcript);
    };
    rec.onerror = (e) => {
      const known: ErrorVoz[] = ['no-speech', 'not-allowed', 'audio-capture', 'network'];
      error = e.error === 'service-not-allowed' ? 'not-allowed' : known.includes(e.error as ErrorVoz) ? (e.error as ErrorVoz) : e.error === 'aborted' ? null : 'otro';
    };
    rec.onend = () => resolve({ text, error: text ? null : (error ?? 'no-speech') });
  });
  try {
    rec.start();
  } catch {
    return { result: Promise.resolve({ text: null, error: 'otro' }), cancel: () => {} };
  }
  return { result, cancel: () => rec.stop() };
}

function localSpanishVoice(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voices = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es') && v.localService);
  return voices.find((v) => v.lang === 'es-PE') ?? voices.find((v) => v.lang === 'es-US') ?? voices[0] ?? null;
}

/** Speaks with a local Spanish voice; returns false (and says nothing) when there is none. */
export function speak(text: string, rate = 1): boolean {
  const voice = localSpanishVoice();
  if (!voice) return false;
  speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = rate;
  speechSynthesis.speak(u);
  return true;
}

export function speechAvailable(): boolean {
  return localSpanishVoice() !== null;
}
