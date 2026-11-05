import { ArrowLeft } from 'lucide-react';
import type { ReactNode } from 'react';
import { cn } from '../lib/cn.ts';

/** Top bar (DESIGN.md 11): 64 px, title left (19 px / 800), status chip or camera pill right, back button when deep. */
export function TopBar({
  title,
  subtitle,
  onBack,
  backLabel = 'Volver',
  trailing,
  className,
}: {
  title: string;
  subtitle?: string;
  onBack?: () => void;
  backLabel?: string;
  trailing?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn('flex min-h-16 items-center gap-2 border-b-2 border-line bg-surface px-3', className)}>
      {onBack ? (
        <button type="button" onClick={onBack} aria-label={backLabel} className="inline-flex size-12 shrink-0 items-center justify-center rounded-ctl">
          <ArrowLeft className="size-6" aria-hidden="true" />
        </button>
      ) : null}
      <div className="min-w-0 flex-1 py-1">
        <h1 className="m-0 text-body-lg font-extrabold leading-6 text-ink">{title}</h1>
        {subtitle ? <p className="m-0 text-caption leading-4 text-ink-2">{subtitle}</p> : null}
      </div>
      {trailing ? <div className="flex shrink-0 items-center gap-2">{trailing}</div> : null}
    </header>
  );
}
