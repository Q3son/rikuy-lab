import { cn } from '../lib/cn.ts';

/**
 * Captions for narration and recorded audio: the text being spoken, in the language being spoken.
 * Not a live region: screen readers already get the content from the page (no double announcement).
 */
export function CaptionBar({ texto, etiqueta, className }: { texto: string | null; etiqueta: string; className?: string }) {
  if (!texto) return null;
  return (
    <section aria-label={etiqueta} className={cn('rounded-ctl border-2 border-ink bg-ink px-4 py-3 text-body-lg font-semibold text-bg', className)}>
      <p className="m-0 max-w-[62ch]">{texto}</p>
    </section>
  );
}
