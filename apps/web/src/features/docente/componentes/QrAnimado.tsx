import { useEffect, useState } from 'react';
import { QrSvg } from './QrSvg.tsx';

interface Props {
  marcos: string[];
  etiqueta: string;
  /** Milliseconds per frame (650 measured in Yaku; 400-900 adjustable). */
  ritmoMs?: number;
  tamano?: number;
}

/** Multi-part QR: loops over the RK1 frames; a static one when there is a single frame. */
export function QrAnimado({ marcos, etiqueta, ritmoMs = 650, tamano = 208 }: Props) {
  const [i, setI] = useState(0);
  useEffect(() => {
    if (marcos.length < 2) return undefined;
    const t = setInterval(() => setI((x) => (x + 1) % marcos.length), ritmoMs);
    return () => clearInterval(t);
  }, [marcos, ritmoMs]);
  const actual = marcos[Math.min(i, marcos.length - 1)] ?? '';
  return (
    <figure className="dc-qr-fig">
      <QrSvg texto={actual} tamano={tamano} etiqueta={etiqueta} />
      {marcos.length > 1 ? <figcaption>Parte {Math.min(i, marcos.length - 1) + 1} de {marcos.length}. Mantén el celular quieto.</figcaption> : null}
    </figure>
  );
}
