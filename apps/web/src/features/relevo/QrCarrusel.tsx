import { useEffect, useMemo, useState } from 'react';
import { qrMatrix, qrPath } from '../../platform/qr.ts';

/** Shows RK1 frames in a loop (650 ms per frame, 3.6), with pause and manual stepping. */
export function QrCarrusel({ frames, intervalMs = 650, label }: { frames: string[]; intervalMs?: number; label: string }) {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const index = frames.length ? i % frames.length : 0;

  useEffect(() => {
    if (paused || frames.length < 2) return;
    const t = setInterval(() => setI((x) => x + 1), intervalMs);
    return () => clearInterval(t);
  }, [paused, frames.length, intervalMs]);

  const matrix = useMemo(() => (frames.length ? qrMatrix(frames[index]) : null), [frames, index]);
  if (!matrix) return null;
  const quiet = 4;
  const size = matrix.size + quiet * 2;

  return (
    <figure className="flex flex-col items-center gap-2" aria-label={label}>
      <svg
        data-testid="qr-cuadro"
        data-frame={frames[index]}
        role="img"
        aria-label={`${label}: cuadro ${index + 1} de ${frames.length}`}
        viewBox={`${-quiet} ${-quiet} ${size} ${size}`}
        className="h-auto w-full max-w-[360px] bg-white"
        shapeRendering="crispEdges"
      >
        <rect x={-quiet} y={-quiet} width={size} height={size} fill="#fff" />
        <path d={qrPath(matrix)} fill="#000" />
      </svg>
      <figcaption className="text-sm text-neutral-300">
        Cuadro {index + 1} de {frames.length}
      </figcaption>
      {frames.length > 1 && (
        <div className="flex gap-2">
          <button type="button" className="rounded border border-neutral-600 px-3 py-1" onClick={() => setI(index - 1 + frames.length)}>
            Anterior
          </button>
          <button type="button" className="rounded border border-neutral-600 px-3 py-1" onClick={() => setPaused((p) => !p)}>
            {paused ? 'Reanudar' : 'Pausar'}
          </button>
          <button type="button" className="rounded border border-neutral-600 px-3 py-1" onClick={() => setI(index + 1)}>
            Siguiente
          </button>
        </div>
      )}
    </figure>
  );
}
