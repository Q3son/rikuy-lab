import { cn } from '../lib/cn.ts';

export interface RangoResaltado {
  inicio: number;
  fin: number;
}

/**
 * Highlighted reading: the text stays whole and readable, and the range being spoken is marked with
 * a Sol background plus an underline (never colour alone). With no range it renders plain text.
 */
export function TextoResaltado({ texto, resaltado, className }: { texto: string; resaltado?: RangoResaltado | null; className?: string }) {
  if (!resaltado || resaltado.fin <= resaltado.inicio) return <span className={className}>{texto}</span>;
  const inicio = Math.max(0, Math.min(resaltado.inicio, texto.length));
  const fin = Math.max(inicio, Math.min(resaltado.fin, texto.length));
  return (
    <span className={className}>
      {texto.slice(0, inicio)}
      <mark data-resaltado className={cn('rounded-sm bg-sol px-0.5 text-sol-on underline decoration-2 underline-offset-2')}>
        {texto.slice(inicio, fin)}
      </mark>
      {texto.slice(fin)}
    </span>
  );
}
