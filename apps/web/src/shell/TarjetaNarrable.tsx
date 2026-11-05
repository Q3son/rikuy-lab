import { Card, TextoResaltado, type CardProps } from '@rikuy/ui';
import type { ReactNode } from 'react';
import { useNarracion } from './accesibilidad/narracion.tsx';

/**
 * A card that can read itself: title (heading), body text with highlighted reading, and the speak /
 * stop button. Every card of the shell goes through this component so none lacks the button.
 * `clave` is the key of the recording in the audio manifest (F9); without one, Spanish uses the device
 * voice and Quechua shows the text with the notice "Sin audio revisado".
 */
export function TarjetaNarrable({
  id,
  titulo,
  texto,
  clave,
  tone,
  children,
  className,
}: {
  id: string;
  titulo?: string;
  texto: string;
  clave?: string;
  tone?: CardProps['tone'];
  children?: ReactNode;
  className?: string;
}) {
  const narracion = useNarracion({ id, clave, texto });
  return (
    <Card tone={tone} narracion={narracion} className={className}>
      {titulo ? <h2 className="m-0 mb-1 text-title-sm font-bold text-ink">{titulo}</h2> : null}
      <p className="measure m-0 text-body text-ink-2">
        <TextoResaltado texto={texto} resaltado={narracion.resaltado} />
      </p>
      {children}
    </Card>
  );
}
