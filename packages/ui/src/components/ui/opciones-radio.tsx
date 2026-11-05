import { RadioGroup } from 'radix-ui';
import { cn } from '../../lib/cn.ts';

export interface OpcionRadio {
  value: string;
  label: string;
  /** Optional second line that explains the option. */
  descripcion?: string;
}

/**
 * Single choice among a few options, drawn as 48 px cards (Radix RadioGroup: arrow keys, roving
 * focus). The selected one has a thicker border and a check dot, never colour alone.
 */
export function OpcionesRadio({
  value,
  onValueChange,
  opciones,
  ariaLabel,
  className,
  vertical = false,
}: {
  value: string;
  onValueChange: (value: string) => void;
  opciones: OpcionRadio[];
  ariaLabel: string;
  className?: string;
  vertical?: boolean;
}) {
  return (
    <RadioGroup.Root
      value={value}
      onValueChange={onValueChange}
      aria-label={ariaLabel}
      className={cn('flex gap-2', vertical ? 'flex-col' : 'flex-wrap', className)}
    >
      {opciones.map((o) => (
        <RadioGroup.Item
          key={o.value}
          value={o.value}
          className={cn(
            'flex min-h-12 flex-1 items-center gap-3 rounded-ctl border-2 border-line-strong bg-surface px-3 py-2 text-left text-body font-semibold text-ink',
            'data-[state=checked]:border-primary data-[state=checked]:bg-primary-tint data-[state=checked]:text-primary-press',
          )}
        >
          <span aria-hidden="true" className="inline-flex size-5 shrink-0 items-center justify-center rounded-chip border-2 border-current">
            <RadioGroup.Indicator className="size-2.5 rounded-chip bg-current" />
          </span>
          <span className="flex flex-col">
            <span>{o.label}</span>
            {o.descripcion ? <span className="text-caption font-normal text-ink-2">{o.descripcion}</span> : null}
          </span>
        </RadioGroup.Item>
      ))}
    </RadioGroup.Root>
  );
}
