/** Hall glyphs and the Rikuy mascot as inline SVG (DESIGN.md 5, 6). 24 px grid, 2 px stroke. */
import type { ReactNode } from 'react';
import type { Expresion, Glifo as NombreGlifo } from '@rikuy/campus';

const TRAZOS: Record<NombreGlifo, ReactNode> = {
  orbita: (
    <>
      <circle cx="12" cy="12" r="2" fill="currentColor" />
      <ellipse cx="12" cy="12" rx="10" ry="4" />
      <ellipse cx="12" cy="12" rx="4" ry="10" />
    </>
  ),
  hoja: <path d="M5 19C5 9 11 5 19 5c0 8-4 14-14 14Zm0 0 8-8" />,
  matraz: <path d="M9 3h6M10 3v6l-5 10h14l-5-10V3M7 15h10" />,
  monte: (
    <>
      <path d="M2 20 9 8l4 6 3-4 6 10Z" />
      <circle cx="18" cy="5" r="2" />
    </>
  ),
  taller: <path d="M14 6a4 4 0 0 0 5 5l-9 9-3-3 9-9a4 4 0 0 1-2-2ZM4 4l4 4" />,
  juego: <path d="M12 3 21 12 12 21 3 12Zm0 5 4 4-4 4-4-4Z" />,
  usuarios: (
    <>
      <circle cx="9" cy="8" r="3" />
      <path d="M3 20c0-4 3-6 6-6s6 2 6 6M16 5a3 3 0 0 1 0 6M18 14c2 1 3 3 3 6" />
    </>
  ),
  museo: <path d="M3 9 12 4l9 5M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" />,
};

export function Glifo({ nombre, tam = 24 }: { nombre: NombreGlifo; tam?: number }) {
  return (
    <svg
      width={tam}
      height={tam}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      {TRAZOS[nombre]}
    </svg>
  );
}

const PUPILA: Record<Expresion, [number, number]> = {
  curiosa: [128, 168],
  piensa: [112, 168],
  celebra: [120, 176],
  sin_red: [120, 182],
};

/** Rikuy, the stone that looks: river stone with one eye on a knotted amber cord. ~1 KB. */
export function Rikuy({
  expresion = 'curiosa',
  tam = 64,
  cordon = '#F5B301',
  marco = '#052A31',
}: {
  expresion?: Expresion;
  tam?: number;
  cordon?: string;
  marco?: string;
}) {
  const [px, py] = PUPILA[expresion];
  return (
    <svg width={(tam * 240) / 300} height={tam} viewBox="0 0 240 300" aria-hidden="true">
      <circle cx="120" cy="16" r="8" fill="#F5F6F1" stroke="#0D2B33" strokeWidth="3.5" />
      <line x1="120" y1="22" x2="120" y2="104" stroke={cordon} strokeWidth="5" strokeLinecap="round" />
      <circle cx="120" cy="66" r="7" fill={cordon} stroke="#8A5E00" strokeWidth="2.5" />
      <path d="M120 96c60 0 88 50 86 100s-40 84-86 84-88-30-86-84 26-100 86-100Z" fill="#0B6574" stroke={marco} strokeWidth="4" />
      <path d="M58 150c10-30 34-48 62-50l-20 70Z" fill="#12879A" />
      <path d="M200 210c-8 36-38 60-80 64l40-70Z" fill="#064550" />
      {expresion === 'celebra' ? (
        <path d="M96 178q24-24 48 0" fill="none" stroke="#0D2B33" strokeWidth="6" strokeLinecap="round" />
      ) : (
        <>
          <circle cx="120" cy="176" r="42" fill="#fff" stroke="#052A31" strokeWidth="5" />
          <circle cx={px} cy={py} r="24" fill="#19CBEE" />
          <circle cx={px} cy={py} r="11" fill="#0D2B33" />
          <circle cx={px + 7} cy={py - 8} r="5" fill="#fff" />
          {expresion === 'sin_red' && <path d="M78 160h84" stroke="#0B6574" strokeWidth="26" />}
        </>
      )}
      <path
        d={expresion === 'piensa' ? 'M90 122h40' : 'M88 128q14-14 34-10'}
        stroke="#0D2B33"
        strokeWidth="8"
        strokeLinecap="round"
        fill="none"
      />
    </svg>
  );
}
