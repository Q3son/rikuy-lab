/**
 * Conversación por voz con Rikuy junto al holograma. El grupo habla (o escribe) y Rikuy:
 *  - ejecuta las órdenes ("pon la longitud en 2 metros", "suéltalo") en el holograma;
 *  - evalúa la respuesta contra la pregunta que tiene abierta y avanza, da una pista o reformula;
 *  - responde en voz alta si el celular tiene una voz en español.
 * El motor (@rikuy/tutor, dialogo/motor.ts) es determinista, funciona sin internet y está probado.
 */
import { useEffect, useRef, useState } from 'react';
import type { ViewerAction } from '@rikuy/holo';
import { iniciarConversacion, preguntaActual, responder, type EstadoConversacion, type TurnoConversacion } from '@rikuy/tutor';
import { listenDetailed, recognitionSupported, type ErrorVoz } from '../../platform/voz/speech.ts';

interface Mensaje {
  id: number;
  autor: 'alumno' | 'rikuy';
  texto: string;
}

interface Props {
  practica: 'pendulo' | 'lactasa';
  enviar(a: ViewerAction): void;
  /** Para registrar el turno en la analítica, si la página lo necesita. */
  onTurno?(texto: string, turno: TurnoConversacion): void;
}

function vozEspanol(): SpeechSynthesisVoice | null {
  if (typeof speechSynthesis === 'undefined') return null;
  const voces = speechSynthesis.getVoices().filter((v) => v.lang.toLowerCase().startsWith('es'));
  return (
    voces.find((v) => v.lang === 'es-PE') ??
    voces.find((v) => v.lang === 'es-US' && v.localService) ??
    voces.find((v) => v.localService) ??
    voces.find((v) => v.lang === 'es-US' || v.lang === 'es-MX') ??
    voces[0] ??
    null
  );
}

function decir(texto: string): void {
  // La voz es un extra: si el navegador falla, el texto en pantalla basta y nada se rompe.
  try {
    if (typeof speechSynthesis === 'undefined' || typeof SpeechSynthesisUtterance === 'undefined') return;
    const voz = vozEspanol();
    speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(texto);
    if (voz) u.voice = voz;
    u.lang = voz?.lang ?? 'es-PE';
    u.rate = 1.05;
    speechSynthesis.speak(u);
  } catch {
    /* sin voz */
  }
}

function callar(): void {
  try {
    if (typeof speechSynthesis !== 'undefined') speechSynthesis.cancel();
  } catch {
    /* sin voz */
  }
}

/** Qué hacer según por qué no se escuchó. */
const AYUDA_MIC: Record<ErrorVoz, string> = {
  'no-speech': 'No escuché nada. Toca el botón y habla apenas se ponga rojo, cerca del micrófono.',
  'not-allowed': 'El navegador no tiene permiso para usar el micrófono. Toca el candado junto a la dirección, permite "Micrófono" y vuelve a intentar.',
  'audio-capture': 'No encontré un micrófono. Revisa que esté conectado y que el sistema le dé permiso al navegador (en Windows: Configuración > Privacidad > Micrófono).',
  network: 'El reconocimiento de voz necesita internet y solo funciona en Chrome o Edge (Brave, Opera y Firefox no lo traen). Revisa la conexión o escribe tu respuesta.',
  'no-soportado': 'Este navegador no reconoce voz. Usa Chrome o Edge, o escribe tu respuesta.',
  otro: 'El micrófono no respondió. Vuelve a intentar o escribe tu respuesta.',
};

export function ConversacionRikuy({ practica, enviar, onTurno }: Props) {
  // Primer turno: bienvenida y primera pregunta. Para otra práctica, el padre cambia la `key`.
  const [inicio] = useState(() => responder('', iniciarConversacion(practica)));
  const [estado, setEstado] = useState<EstadoConversacion>(inicio.estado);
  const [mensajes, setMensajes] = useState<Mensaje[]>([{ id: 0, autor: 'rikuy', texto: inicio.texto }]);
  const [escuchando, setEscuchando] = useState(false);
  const [parcial, setParcial] = useState('');
  const [valor, setValor] = useState('');
  const [conVoz, setConVoz] = useState(true);
  const id = useRef(1);
  // Fuente de verdad para turnos seguidos (la voz puede responder antes del siguiente render).
  const estadoRef = useRef(inicio.estado);
  const lista = useRef<HTMLDivElement>(null);

  // Las voces del navegador cargan tarde en Android: se piden una vez al montar.
  useEffect(() => {
    try {
      if (typeof speechSynthesis !== 'undefined') speechSynthesis.getVoices();
    } catch {
      /* sin voz */
    }
  }, []);

  useEffect(() => {
    const el = lista.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [mensajes]);

  function turno(texto: string) {
    const limpio = texto.trim();
    if (!limpio) return;
    const t = responder(limpio, estadoRef.current);
    estadoRef.current = t.estado;
    setEstado(t.estado);
    for (const o of t.ordenes) enviar(o as ViewerAction);
    setMensajes((m) => [...m.slice(-10), { id: id.current++, autor: 'alumno', texto: limpio }, { id: id.current++, autor: 'rikuy', texto: t.texto }]);
    if (conVoz) decir(t.texto);
    onTurno?.(limpio, t);
  }

  async function hablar() {
    if (escuchando) return;
    callar();
    setEscuchando(true);
    setParcial('');
    let r: { text: string | null; error: ErrorVoz | null };
    try {
      r = await listenDetailed('es-PE', setParcial).result;
    } catch {
      r = { text: null, error: 'otro' };
    }
    setEscuchando(false);
    setParcial('');
    if (r.text) turno(r.text);
    else setMensajes((m) => [...m.slice(-10), { id: id.current++, autor: 'rikuy', texto: AYUDA_MIC[r.error ?? 'otro'] }]);
  }

  function reiniciar() {
    const t = responder('', iniciarConversacion(practica));
    estadoRef.current = t.estado;
    setEstado(t.estado);
    setMensajes([{ id: id.current++, autor: 'rikuy', texto: t.texto }]);
    if (conVoz) decir(t.texto);
  }

  const microfono = recognitionSupported();
  return (
    <section aria-label="Conversación con Rikuy" className="flex flex-col gap-2 rounded-xl border-2 border-[#075E6C] bg-white p-3">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-[17px] font-extrabold text-[#0D2B33]">Habla con Rikuy</h2>
        <div className="flex gap-2 text-sm">
          <button type="button" onClick={() => setConVoz((v) => !v)} className="min-h-10 rounded-lg border border-[#6A7568] px-2" aria-pressed={conVoz}>
            {conVoz ? '🔊 Voz' : '🔇 Sin voz'}
          </button>
          <button type="button" onClick={reiniciar} className="min-h-10 rounded-lg border border-[#6A7568] px-2">
            Empezar de nuevo
          </button>
        </div>
      </div>

      <p className="rounded-lg bg-[#E7F1FB] px-3 py-2 text-[15px] font-semibold text-[#0D2B33]" aria-live="polite">
        {preguntaActual(estado)}
      </p>

      <div ref={lista} className="flex max-h-64 flex-col gap-2 overflow-y-auto" aria-live="polite">
        {mensajes.map((m) => (
          <p
            key={m.id}
            className={
              m.autor === 'alumno'
                ? 'self-end rounded-xl bg-[#F0EFEC] px-3 py-2 text-[15px]'
                : 'self-start rounded-xl border border-[#9CC9CF] bg-[#EAF6F7] px-3 py-2 text-[15px]'
            }
          >
            {m.autor === 'rikuy' && <b>Rikuy: </b>}
            {m.texto}
          </p>
        ))}
      </div>

      {microfono && (
        <button
          type="button"
          onClick={() => void hablar()}
          className={`h-16 rounded-xl text-lg font-bold text-white ${escuchando ? 'bg-[#96102F]' : 'bg-[#075E6C]'}`}
        >
          {escuchando ? (parcial ? `🔴 “${parcial}”` : '🔴 Te escucho… habla ahora') : '🎙 Tocar y hablar con Rikuy'}
        </button>
      )}
      <form
        className="flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          turno(valor);
          setValor('');
        }}
      >
        <label className="sr-only" htmlFor="respuesta-rikuy">Tu respuesta</label>
        <input
          id="respuesta-rikuy"
          value={valor}
          onChange={(e) => setValor(e.target.value)}
          placeholder={microfono ? '…o escribe tu respuesta' : 'Escribe tu respuesta'}
          className="min-h-12 min-w-0 flex-1 rounded-lg border-2 border-[#6A7568] px-3"
        />
        <button type="submit" className="min-h-12 rounded-lg bg-[#0D2B33] px-4 font-semibold text-white">
          Enviar
        </button>
      </form>
      <p className="text-xs text-[#4D6368]">Puedes decir: "no sé", "repite", "pon la longitud en 2 metros", "suéltalo". El reconocimiento de voz del navegador puede usar internet.</p>
    </section>
  );
}
