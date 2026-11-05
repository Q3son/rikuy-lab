import { PICTOGRAMAS, type PictoId } from '@rikuy/evidencia';

/** Pictogram with a visible caption: the caption carries the meaning, color never does. */
export function Pictograma({ id, etiqueta }: { id: PictoId; etiqueta?: string }) {
  const p = PICTOGRAMAS[id];
  return (
    <span className="fa-picto">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
        {p.trazos.map((d) => (
          <path key={d} d={d} />
        ))}
      </svg>
      {etiqueta ? <span>{etiqueta}</span> : null}
    </span>
  );
}
