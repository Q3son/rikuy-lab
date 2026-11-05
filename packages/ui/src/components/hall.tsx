import type { ReactNode } from 'react';
import { cn } from '../lib/cn.ts';
import { Button } from './ui/button.tsx';
import { Chip } from './ui/chip.tsx';
import { HallGlyph, KnotIcon, type KnotTipo, type SalaId } from './icons.tsx';
import { SpeakButton, type Narracion } from './speak-button.tsx';
import { TextoResaltado } from './texto-resaltado.tsx';

/**
 * Hall sign: full-width block in the hall colour, 48 px glyph tile, hall name (20 px / 800),
 * Quechua sublabel (14 px italic), count on the right and the trama strip along the bottom edge.
 * Hall colours are wayfinding only; they never carry scientific meaning.
 */
export function HallSign({ sala, nombre, sublabel, contador, className }: { sala: SalaId; nombre: string; sublabel?: string; contador?: string; className?: string }) {
  return (
    <div data-testid="hall-sign" data-hall={sala} className={cn('overflow-hidden rounded-ctl bg-hall text-hall-on', className)}>
      <div className="flex min-h-[3.75rem] items-center gap-3 px-3 py-2">
        <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-ctl border-2 border-hall-on">
          <HallGlyph sala={sala} size={28} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-title-sm font-extrabold">{nombre}</p>
          {sublabel ? <p className="text-caption italic">{sublabel}</p> : null}
        </div>
        {contador ? <p className="text-caption font-semibold">{contador}</p> : null}
      </div>
      <div className="trama" aria-hidden="true" />
    </div>
  );
}

export interface PlaqueProps {
  sala: SalaId;
  salaNombre: string;
  titulo: string;
  /** One Socratic question. */
  pregunta: string;
  chips?: string[];
  /** Three slots: earned knot type or null for an empty slot. */
  nudos?: [KnotTipo | null, KnotTipo | null, KnotTipo | null];
  nudosLabel?: string;
  accion: string;
  onAccion?: () => void;
  className?: string;
  children?: ReactNode;
  narracion?: Narracion;
}

/** Exhibit plaque: 10 px left rail in the hall colour, glyph + hall name, title, question, meta row, knots, action. */
export function Plaque({ sala, salaNombre, titulo, pregunta, chips = [], nudos = [null, null, null], nudosLabel, accion, onAccion, className, children, narracion }: PlaqueProps) {
  return (
    <article
      data-testid="plaque"
      data-hall={sala}
      className={cn('relative overflow-hidden rounded-card border-2 border-line bg-surface p-4 pl-7 shadow-card before:absolute before:inset-y-0 before:left-0 before:w-2.5 before:bg-hall', className)}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="flex items-center gap-1.5 text-caption font-bold text-hall-ink">
            <HallGlyph sala={sala} size={20} />
            {salaNombre}
          </p>
          <h3 className="mt-1 text-title-sm font-extrabold text-ink">{titulo}</h3>
        </div>
        {narracion ? <SpeakButton {...narracion} /> : null}
      </div>
      <p className="mt-1 text-[1rem] leading-6 text-ink-2">
        <TextoResaltado texto={pregunta} resaltado={narracion?.resaltado} />
      </p>
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {chips.map((c) => (
          <Chip key={c}>{c}</Chip>
        ))}
        <span role="img" aria-label={nudosLabel} className="ml-auto inline-flex items-center gap-1 text-hall-ink">
          {nudos.map((n, i) => (
            <span key={i} data-knot-slot data-earned={n ? 'true' : 'false'} className={cn('inline-flex', n ? '' : 'opacity-35')}>
              <KnotIcon tipo={n ?? 'simple'} size={24} />
            </span>
          ))}
        </span>
      </div>
      {children}
      <Button className="mt-3 w-full" size="lg" onClick={onAccion}>
        {accion}
      </Button>
    </article>
  );
}
