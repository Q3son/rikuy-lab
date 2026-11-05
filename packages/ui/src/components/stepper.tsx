import { Check } from 'lucide-react';
import { cn } from '../lib/cn.ts';

export type EstadoPaso = 'hecho' | 'ahora' | 'despues';

export interface Paso {
  id: string;
  label: string;
  estado: EstadoPaso;
  /** The state spelled out ("lista", "toca ahora", "después"): state is never colour alone. */
  estadoLabel: string;
  href: string;
}

/**
 * Stepper of the teacher day (T-01): four stages, each one a link to its screen. Done = check,
 * now = highlighted with the current step marked for assistive tech, later = plain.
 */
export function Stepper({ pasos, ariaLabel, className }: { pasos: Paso[]; ariaLabel: string; className?: string }) {
  return (
    <ol aria-label={ariaLabel} className={cn('m-0 grid list-none grid-cols-2 gap-2 p-0 min-[460px]:grid-cols-4', className)}>
      {pasos.map((paso, i) => (
        <li key={paso.id} className="min-w-0">
          <a
            href={paso.href}
            aria-current={paso.estado === 'ahora' ? 'step' : undefined}
            data-estado={paso.estado}
            className={cn(
              'flex h-full min-h-[5.25rem] flex-col gap-1 rounded-card border-2 p-2 no-underline',
              paso.estado === 'ahora' ? 'border-primary bg-primary-tint text-ink' : 'border-line bg-surface text-ink',
              paso.estado === 'hecho' && 'border-ichu',
            )}
          >
            <span className="flex items-center gap-1 text-small font-extrabold">
              {paso.estado === 'hecho' ? (
                <Check className="size-4 text-ichu-ink" aria-hidden="true" />
              ) : (
                <span aria-hidden="true" className="tabular">{i + 1}</span>
              )}
              <span className="break-words">{paso.label}</span>
            </span>
            <span className="text-caption leading-4 text-ink-2">{paso.estadoLabel}</span>
          </a>
        </li>
      ))}
    </ol>
  );
}
