import { Switch as SwitchPrimitive } from 'radix-ui';
import { useId } from 'react';
import { cn } from '../../lib/cn.ts';

export interface SwitchProps {
  label: string;
  /** Text shown when on / off: state is never colour alone. */
  onLabel: string;
  offLabel: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  className?: string;
}

/** 56 px row, 64 x 36 px switch and the state spelled out beside it (DESIGN.md 11). */
export function Switch({ label, onLabel, offLabel, checked, onCheckedChange, disabled, className }: SwitchProps) {
  const id = useId();
  return (
    <div className={cn('flex min-h-14 items-center justify-between gap-3', className)}>
      <label htmlFor={id} className="text-body font-semibold text-ink">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <span className="text-caption font-semibold text-ink-2" aria-hidden="true">
          {checked ? onLabel : offLabel}
        </span>
        <SwitchPrimitive.Root
          id={id}
          checked={checked}
          disabled={disabled}
          onCheckedChange={onCheckedChange}
          className={cn(
            'relative inline-flex h-9 w-16 shrink-0 items-center rounded-chip border-2 border-line-strong bg-surface-2',
            'data-[state=checked]:border-primary data-[state=checked]:bg-primary disabled:opacity-60',
          )}
        >
          <SwitchPrimitive.Thumb
            className={cn(
              'block size-6 translate-x-1 rounded-chip border-2 border-line-strong bg-surface',
              'transition-transform duration-[var(--rk-dur)] ease-rk data-[state=checked]:translate-x-[30px] data-[state=checked]:border-primary-on',
            )}
          />
        </SwitchPrimitive.Root>
      </div>
    </div>
  );
}
