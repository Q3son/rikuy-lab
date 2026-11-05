import { Square, Volume2 } from 'lucide-react';
import { useId } from 'react';
import { cn } from '../lib/cn.ts';

/** Props every card and plaque accepts to offer its own narration (audio mode, DESIGN.md 15). */
export interface Narracion {
  hablando: boolean;
  onToggle: () => void;
  /** "Escuchar": what the button does when idle. */
  hablarLabel: string;
  /** "Detener": what the button does while speaking. */
  detenerLabel: string;
  disabled?: boolean;
  /** Why narration is not possible ("Sin audio revisado"); read as the button description. */
  motivo?: string;
  /** Range being read right now (highlighted reading); cards mark it in their main text. */
  resaltado?: { inicio: number; fin: number } | null;
}

/**
 * Speak / stop button: 48 px, icon plus accessible name. The name changes with the state (no
 * aria-pressed on top, which would announce the state twice).
 */
export function SpeakButton({ hablando, onToggle, hablarLabel, detenerLabel, disabled, motivo, className }: Narracion & { className?: string }) {
  const motivoId = useId();
  const Icon = hablando ? Square : Volume2;
  return (
    <>
      <button
        type="button"
        onClick={onToggle}
        disabled={disabled}
        aria-label={hablando ? detenerLabel : hablarLabel}
        aria-describedby={motivo ? motivoId : undefined}
        data-hablando={hablando}
        className={cn(
          'inline-flex size-12 shrink-0 items-center justify-center rounded-ctl border-2 border-line-strong bg-surface text-ink',
          hablando && 'border-primary bg-primary-tint text-primary-press',
          'disabled:border-line disabled:bg-surface-2 disabled:text-niebla',
          className,
        )}
      >
        <Icon className="size-6" aria-hidden="true" />
      </button>
      {motivo ? (
        <span id={motivoId} className="sr-only">
          {motivo}
        </span>
      ) : null}
    </>
  );
}
