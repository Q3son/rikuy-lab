import { matrizQr } from './qr.ts';

interface Props {
  texto: string;
  /** Side in CSS px. */
  tamano?: number;
  etiqueta: string;
}

/** Always ink on paper, in every theme (a QR must stay readable). */
export function QrSvg({ texto, tamano = 208, etiqueta }: Props) {
  const m = matrizQr(texto);
  const margen = 4;
  const lado = m.length + margen * 2;
  let d = '';
  m.forEach((fila, y) =>
    fila.forEach((oscuro, x) => {
      if (oscuro) d += `M${x + margen} ${y + margen}h1v1h-1z`;
    }),
  );
  return (
    <svg role="img" aria-label={etiqueta} viewBox={`0 0 ${lado} ${lado}`} width={tamano} height={tamano} shapeRendering="crispEdges" className="dc-qr">
      <rect width={lado} height={lado} fill="var(--rk-qr-paper, #FCFDFB)" />
      <path d={d} fill="var(--rk-qr-ink, #0D2B33)" />
    </svg>
  );
}
