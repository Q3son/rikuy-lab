import { Box, Check, CircleHelp, Download, ListOrdered, Play, Video, Volume2 } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn.ts';
import { Button } from './ui/button.tsx';
import { Chip } from './ui/chip.tsx';
import type { SalaId } from './icons.tsx';
import { SpeakButton, type Narracion } from './speak-button.tsx';

export type FormatoExhibicion = 'video' | 'audio' | 'diagrama' | 'holograma' | 'quiz';
export type EstadoDescarga = 'guardado' | 'en-clase' | 'descargando';

const BADGE_ICON: Record<FormatoExhibicion, ReactNode> = {
  video: <Video />,
  audio: <Volume2 />,
  diagrama: <ListOrdered />,
  holograma: <Box />,
  quiz: <CircleHelp />,
};

const BARS = [10, 22, 14, 30, 18, 26, 12, 32, 20, 16, 28, 14, 24, 10, 18];

/** Art area (132 px high, on the hall tint). Each format draws the same anatomy differently. */
function Art({ formato }: { formato: FormatoExhibicion }) {
  switch (formato) {
    case 'video':
      return (
        <div className="relative flex h-full items-center justify-center" aria-hidden="true">
          <span className="inline-flex size-14 items-center justify-center rounded-chip bg-hall text-hall-on">
            <Play className="size-7" />
          </span>
          <span className="absolute inset-x-4 bottom-3 h-1.5 rounded-chip bg-line-strong/40">
            <span className="block h-full w-1/3 rounded-chip bg-hall" />
          </span>
          <span className="absolute bottom-6 right-4 rounded-ctl border-2 border-hall px-1.5 text-caption font-bold text-hall-ink">CC</span>
        </div>
      );
    case 'audio':
      return (
        <div className="flex h-full items-center justify-center gap-1" aria-hidden="true">
          {BARS.map((h, i) => (
            <span key={i} className={cn('w-1.5 rounded-chip', i < 5 ? 'bg-line-strong' : 'bg-hall')} style={{ height: h * 2 }} />
          ))}
        </div>
      );
    case 'diagrama':
      return (
        <svg viewBox="0 0 200 100" className="h-full w-full" aria-hidden="true" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <g className="text-hall-ink">
            <circle cx="30" cy="50" r="14" />
            <circle cx="100" cy="50" r="14" />
            <circle cx="170" cy="50" r="14" />
            <path d="M44 50h42M114 50h42" />
          </g>
          <g fill="currentColor" stroke="none" className="text-hall-ink" fontSize="14" fontWeight="800" textAnchor="middle">
            <text x="30" y="55">1</text>
            <text x="100" y="55">2</text>
            <text x="170" y="55">3</text>
          </g>
        </svg>
      );
    case 'holograma':
      return (
        <div className="relative flex h-full items-center justify-center" aria-hidden="true">
          <svg viewBox="0 0 120 100" className="h-full" fill="none" stroke="var(--rk-primary)" strokeWidth="2.5" strokeLinecap="round">
            <path d="M60 6v50" />
            <circle cx="60" cy="68" r="12" />
            <ellipse cx="60" cy="92" rx="26" ry="5" />
          </svg>
          <span className="absolute left-2 top-2 size-3 border-l-2 border-t-2 border-primary" />
          <span className="absolute right-2 top-2 size-3 border-r-2 border-t-2 border-primary" />
          <span className="absolute bottom-2 left-2 size-3 border-b-2 border-l-2 border-primary" />
          <span className="absolute bottom-2 right-2 size-3 border-b-2 border-r-2 border-primary" />
        </div>
      );
    case 'quiz':
      return (
        <div className="flex h-full flex-col justify-center gap-1.5 px-6" aria-hidden="true">
          {[0, 1, 2].map((i) => (
            <span key={i} className={cn('h-6 rounded-ctl border-2', i === 1 ? 'border-hall bg-hall-tint' : 'border-line-strong bg-surface')} />
          ))}
        </div>
      );
  }
}

export interface ExhibitCardProps {
  formato: FormatoExhibicion;
  /** Word of the format badge ("Video", "Audio", ...). */
  formatoLabel: string;
  titulo: string;
  descripcion: string;
  tamano: string;
  estado: EstadoDescarga;
  /** "Guardado" / "Se descarga en la clase": download state is always visible. */
  estadoLabel: string;
  accion: string;
  onAccion?: () => void;
  sala?: SalaId;
  className?: string;
  narracion?: Narracion;
}

/**
 * One card anatomy, five formats (DESIGN.md 7.3): art area 132 px high on the hall tint, format badge
 * (icon + word) top-left, title, one-line description, size chip, download state and action.
 * The hologram format always paints in the holo theme (black ground, line work).
 */
export function ExhibitCard({ formato, formatoLabel, titulo, descripcion, tamano, estado, estadoLabel, accion, onAccion, sala, className, narracion }: ExhibitCardProps) {
  return (
    <article
      data-testid="exhibit-card"
      data-formato={formato}
      data-hall={sala}
      className={cn('overflow-hidden rounded-card border-2 border-line bg-surface shadow-card', className)}
    >
      <div
        data-testid="exhibit-art"
        {...(formato === 'holograma' ? { 'data-theme': 'holo' } : {})}
        className={cn('relative h-[8.25rem]', formato === 'holograma' ? 'bg-bg' : 'bg-hall-tint')}
      >
        <Chip className="absolute left-2 top-2 z-10" icon={BADGE_ICON[formato]}>
          {formatoLabel}
        </Chip>
        <Art formato={formato} />
      </div>
      <div className="flex flex-col gap-2 p-4">
        <h3 className="text-title-sm font-extrabold text-ink">{titulo}</h3>
        <p className="text-small text-ink-2">{descripcion}</p>
        <div className="flex flex-wrap items-center gap-2">
          <Chip>{tamano}</Chip>
          <Chip variant={estado === 'guardado' ? 'ok' : 'sync'} icon={estado === 'guardado' ? <Check /> : <Download />}>
            {estadoLabel}
          </Chip>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="tonal" onClick={onAccion} className="flex-1">
            {accion}
          </Button>
          {narracion ? <SpeakButton {...narracion} /> : null}
        </div>
      </div>
    </article>
  );
}
