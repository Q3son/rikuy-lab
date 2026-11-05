import { cn } from '../lib/cn.ts';

/**
 * Always-mounted live region. A region that appears together with its text is often not announced,
 * so the container stays in the DOM and only the message changes. Polite by default (saves, sync,
 * knots); assertive only for things that need attention now (camera stopped, data not saved).
 */
export function LiveRegion({ mensaje, urgencia = 'polite', visible = false, className }: { mensaje: string; urgencia?: 'polite' | 'assertive'; visible?: boolean; className?: string }) {
  return (
    <div
      role={urgencia === 'assertive' ? 'alert' : 'status'}
      aria-live={urgencia}
      aria-atomic="true"
      className={cn(visible ? '' : 'sr-only', className)}
    >
      {mensaje}
    </div>
  );
}

export interface MensajeTutor {
  id: string;
  texto: string;
}

/** Tutor messages: a labelled log that appends new messages politely without moving focus. */
export function TutorLog({ mensajes, etiqueta, className }: { mensajes: MensajeTutor[]; etiqueta: string; className?: string }) {
  return (
    <div role="log" aria-label={etiqueta} aria-live="polite" aria-relevant="additions" className={className}>
      <ul className="m-0 flex list-none flex-col gap-2 p-0">
        {mensajes.map((m) => (
          <li key={m.id} className="max-w-[62ch] rounded-card border-2 border-line-strong bg-surface p-3 text-body text-ink">
            {m.texto}
          </li>
        ))}
      </ul>
    </div>
  );
}
