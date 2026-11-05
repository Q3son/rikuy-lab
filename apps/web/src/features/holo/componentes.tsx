/** Presentational pieces of the hologram feature (DESIGN 7.5, 7.6, 10.3). UI copy in Spanish. */
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { ViewerAction } from '@rikuy/holo';
import type { GestureStatus, HandPose } from '../../platform/gestos/index.ts';
import { encodeQr } from './sala/qr.ts';

/** "Cámara activa" pill with the power kill-switch (10.3): always visible while the camera runs. */
export function CamaraActiva({ onApagar }: { onApagar: () => void }) {
  return (
    <div role="status" className="flex h-12 items-center gap-2 rounded-full border-2 border-[#A8123B] bg-[#FBE6EA] pl-3 pr-1 text-[#96102F]">
      <span aria-hidden="true">●</span>
      <span className="text-sm font-semibold">Cámara activa</span>
      <span className="hidden text-xs sm:inline">· solo tu mano · nada se guarda</span>
      <button
        type="button"
        onClick={onApagar}
        aria-label="Apagar cámara"
        className="ml-1 grid h-12 w-12 place-items-center rounded-full"
      >
        <span aria-hidden="true" className="grid h-9 w-9 place-items-center rounded-full border-2 border-[#A8123B] font-bold">⏻</span>
      </button>
    </div>
  );
}

/** QR as inline SVG (no canvas, nothing exportable). */
export function QrSvg({ texto, etiqueta, tam = 208 }: { texto: string; etiqueta: string; tam?: number }) {
  const m = encodeQr(texto);
  const n = m.length + 8;
  const path = m.flatMap((row, y) => row.map((on, x) => (on ? `M${x + 4} ${y + 4}h1v1h-1z` : ''))).join('');
  return (
    <svg role="img" aria-label={etiqueta} width={tam} height={tam} viewBox={`0 0 ${n} ${n}`} shapeRendering="crispEdges" className="rounded-lg border-[3px] border-[#0D2B33]">
      <rect width={n} height={n} fill="#fff" />
      <path d={path} fill="#0D2B33" />
    </svg>
  );
}

const BOTONES: Array<{ etiqueta: string; icono: string; accion: ViewerAction }> = [
  { etiqueta: 'Girar', icono: '↻', accion: { type: 'rotate', dx: 0.6, dy: 0 } },
  { etiqueta: 'Acercar', icono: '＋', accion: { type: 'zoom', factor: 1.25 } },
  { etiqueta: 'Alejar', icono: '－', accion: { type: 'zoom', factor: 0.8 } },
  { etiqueta: 'Pausa', icono: '⏸', accion: { type: 'pause' } },
  { etiqueta: 'Centrar', icono: '⊙', accion: { type: 'center' } },
];

/** Touch fallbacks: every gesture has a 48 px+ button (7.6, 15). "Soltar" is the big primary one. */
export function BotonesTactiles({ enviar, oscuro = false }: { enviar: (a: ViewerAction) => void; oscuro?: boolean }) {
  const base = oscuro ? 'border-[#5FE3FF] text-[#5FE3FF] bg-black' : 'border-[#6A7568] text-[#0D2B33] bg-white';
  return (
    <div className="flex flex-col gap-2">
      <button
        type="button"
        onClick={() => enviar({ type: 'release' })}
        className={`h-14 rounded-xl border-2 text-lg font-bold ${oscuro ? 'border-[#FFC14D] text-[#FFC14D] bg-black' : 'border-[#04474F] bg-[#075E6C] text-white'}`}
      >
        ▶ Soltar el péndulo
      </button>
      <div className="grid grid-cols-5 gap-2">
        {BOTONES.map((b) => (
          <button key={b.etiqueta} type="button" onClick={() => enviar(b.accion)} className={`flex h-14 flex-col items-center justify-center rounded-xl border-2 text-xs font-semibold ${base}`}>
            <span aria-hidden="true" className="text-lg leading-none">{b.icono}</span>
            {b.etiqueta}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Drag to rotate, pinch to zoom, with a finger. Same deltas as the classic touchpad. */
export function PadTactil({ enviar, children }: { enviar: (a: ViewerAction) => void; children?: ReactNode }) {
  const ref = useRef<HTMLDivElement>(null);
  const send = useRef(enviar);
  useEffect(() => {
    send.current = enviar;
  }, [enviar]);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const pts = new Map<number, { x: number; y: number }>();
    let lastDist = 0;
    const dist = () => {
      const [a, b] = [...pts.values()];
      return Math.hypot(a.x - b.x, a.y - b.y);
    };
    const down = (e: PointerEvent) => {
      el.setPointerCapture?.(e.pointerId);
      pts.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pts.size === 2) lastDist = dist();
    };
    const move = (e: PointerEvent) => {
      const prev = pts.get(e.pointerId);
      if (!prev) return;
      const cur = { x: e.clientX, y: e.clientY };
      pts.set(e.pointerId, cur);
      if (pts.size === 1) send.current({ type: 'rotate', dx: (cur.x - prev.x) * 0.012, dy: (cur.y - prev.y) * 0.012 });
      else if (pts.size === 2) {
        const d = dist();
        if (lastDist > 0) send.current({ type: 'zoom', factor: d / lastDist });
        lastDist = d;
      }
    };
    const up = (e: PointerEvent) => {
      pts.delete(e.pointerId);
      lastDist = pts.size === 2 ? dist() : 0;
    };
    el.addEventListener('pointerdown', down);
    el.addEventListener('pointermove', move);
    el.addEventListener('pointerup', up);
    el.addEventListener('pointercancel', up);
    return () => {
      el.removeEventListener('pointerdown', down);
      el.removeEventListener('pointermove', move);
      el.removeEventListener('pointerup', up);
      el.removeEventListener('pointercancel', up);
    };
  }, []);
  return (
    <div ref={ref} style={{ touchAction: 'none' }} className="grid min-h-40 place-items-center rounded-2xl border-2 border-dashed border-[#6A7568] bg-[#E9ECE4] p-4 text-center text-[#33494F]">
      {children ?? 'Arrastra para girar · pellizca para acercar'}
    </div>
  );
}

const POSES: Record<HandPose, string> = {
  palm: 'mano abierta: girando',
  pinch: 'pellizco: acercando',
  fist: 'puño: pausa',
  thumbs_up: 'pulgar arriba: soltar',
};

/** One sentence about the camera state, always with a way forward (E-05b). */
export function EstadoCamara({ status, pose }: { status: GestureStatus; pose: HandPose | null }) {
  const texto: Record<GestureStatus, string | null> = {
    off: null,
    loading: 'Preparando la cámara de manos…',
    active: pose ? `Mano detectada · ${POSES[pose]}` : 'Muestra tu mano a la cámara frontal.',
    slow: 'Este celular va lento con la cámara. Usa los botones de abajo.',
    blocked: 'La profesora apagó los gestos. Usa los botones o la voz.',
    error: 'La cámara no funcionó. Usa los botones o la voz: hacen lo mismo.',
  };
  const t = texto[status];
  if (!t) return null;
  const alerta = status === 'error' || status === 'blocked' || status === 'slow';
  return (
    <p role={alerta ? 'alert' : 'status'} aria-live="polite" className={`rounded-xl border-2 px-3 py-2 text-[15px] ${alerta ? 'border-[#F5B301] bg-[#FFF1CC] text-[#6B4300]' : 'border-[#00566A] bg-[#D9F4FA] text-[#00566A]'}`}>
      {t}
    </p>
  );
}

const GUIA_KEY = 'rikuy.holo.guiaGestos';

/** Gesture-hint card (7.6): first two openings, dismiss anywhere, never needs the camera. */
export function GuiaGestos() {
  const [visible, setVisible] = useState(() => {
    try {
      const n = Number(localStorage.getItem(GUIA_KEY) ?? '0');
      localStorage.setItem(GUIA_KEY, String(n + 1));
      return n < 2;
    } catch {
      return true;
    }
  });
  if (!visible) return null;
  const filas = [
    ['✋', 'Mano abierta y mueve: girar'],
    ['🤏', 'Pellizca: acercar o alejar'],
    ['✊', 'Puño: pausa'],
    ['👍', 'Pulgar arriba: soltar el péndulo'],
  ];
  return (
    <div role="dialog" aria-label="Guía de gestos" onClick={() => setVisible(false)} className="rounded-2xl border-2 border-[#D3D9CC] bg-white p-4 text-[#0D2B33]">
      <p className="mb-2 text-lg font-extrabold">Mueve el holograma con tu mano</p>
      <ul className="mb-3 flex flex-col gap-2">
        {filas.map(([i, t]) => (
          <li key={t} className="flex items-center gap-3 text-[17px] font-bold">
            <span aria-hidden="true" className="grid h-12 w-12 place-items-center rounded-full bg-[#DCEBEC] text-2xl">{i}</span>
            {t}
          </li>
        ))}
      </ul>
      <p className="mb-3 text-sm text-[#33494F]">¿Sin cámara? Los botones de abajo hacen lo mismo.</p>
      <button type="button" className="h-12 w-full rounded-xl bg-[#075E6C] font-semibold text-white">Entendido</button>
    </div>
  );
}
