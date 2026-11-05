import { RefreshCw } from 'lucide-react';
import { cn } from '../lib/cn.ts';
import { Button } from './ui/button.tsx';

/**
 * "Versión nueva" banner. A polite live region: it never interrupts a measurement. Updating is the
 * user decision (the new service worker waits until then), and dismissing costs nothing.
 */
export function UpdateBanner({
  mensaje,
  accion,
  onAccion,
  descartar,
  onDescartar,
  className,
}: {
  mensaje: string;
  accion: string;
  onAccion: () => void;
  descartar: string;
  onDescartar: () => void;
  className?: string;
}) {
  return (
    <div role="status" aria-live="polite" className={cn('flex flex-wrap items-center gap-2 border-b-2 border-foton-ink bg-foton-tint px-3 py-2 text-foton-ink', className)}>
      <RefreshCw className="size-5 shrink-0" aria-hidden="true" />
      <p className="m-0 min-w-0 flex-1 text-small font-semibold">{mensaje}</p>
      <Button size="default" onClick={onAccion}>
        {accion}
      </Button>
      <Button size="default" variant="secondary" onClick={onDescartar}>
        {descartar}
      </Button>
    </div>
  );
}
